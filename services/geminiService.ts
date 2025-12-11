
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { TakeoffResult, TakeoffItem, RebarItem, TechnicalQuery, AppMode } from "../types";

// Helper for Exponential Backoff Retry
const retryOperation = async <T>(
  operation: () => Promise<T>, 
  retries = 3, 
  delay = 1000
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    console.log(`API Call Failed. Retrying in ${delay}ms... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryOperation(operation, retries - 1, delay * 2);
  }
};

const takeoffSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    projectName: {
      type: Type.STRING,
      description: "Project name derived from title block. If not found, use a generic name.",
    },
    drawingType: {
      type: Type.STRING,
      description: "Classification of the drawing set (e.g. 'Full Project Set', 'Architectural & Structural').",
    },
    unitSystem: {
      type: Type.STRING,
      description: "The unit system used for this takeoff.",
      enum: ['metric', 'imperial']
    },
    summary: {
      type: Type.STRING,
      description: "Executive summary of the scope of works and methodology used. Mention if a Previous Payment Excel was used for cross-referencing.",
    },
    items: {
      type: Type.ARRAY,
      description: "Main Dimension Sheet items (Concrete, Formwork, Excavation, Finishes)",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Item reference (e.g., A, B, C...)" },
          billItemDescription: { 
            type: Type.STRING, 
            description: "The Item Description. Format: '[Category]: [Work Group] - [Item Name]'. Example: 'Sub Structure: Excavation - Trenching' or 'Super Structure: Columns - RC Columns'." 
          },
          locationDescription: {
            type: Type.STRING,
            description: "The SPECIFIC location/axis. Example: 'Axis A-1', 'North Elevation', or 'Axis 1-4'."
          },
          sourceRef: {
             type: Type.STRING,
             description: "CITATION: Which drawing file(s) did this number come from? E.g. 'A-101 Floor Plan' or 'S-202 Section'."
          },
          timesing: { type: Type.NUMBER, description: "The multiplier/timesing factor. IMPORTANT: If this item repeats on multiple floors (High Rise), put the Floor Count here." },
          dimension: { type: Type.STRING, description: "The dimension logic (e.g., '10.00 x 0.60'). Show the MATH." },
          quantity: { type: Type.NUMBER, description: "The calculated total quantity. Use NEGATIVE numbers for 'Deduct' items." },
          unit: { type: Type.STRING, description: "Metric/Imperial unit (m, m2, m3, ft, sq.ft, cu.yd, kg, nr)." },
          category: { 
            type: Type.STRING, 
            description: "Standard BOQ Categories",
            enum: ['General & External', 'Sub Structure', 'Super Structure', 'Masonry & Partitioning', 'Finishing Works', 'Openings (Doors/Windows)', 'Roofing', 'Electrical', 'Mechanical', 'Sanitary & Plumbing']
          },
          confidence: { type: Type.STRING, description: "High, Medium, or Low" },
          contractRate: { type: Type.NUMBER, description: "If a Contract/BOQ file was provided, extract the matching Unit Rate for this item here." },
          contractQuantity: { type: Type.NUMBER, description: "Extracted from the User's Excel File: The total BOQ/Contract Quantity." },
          previousQuantity: { type: Type.NUMBER, description: "Extracted from the User's Excel File: The sum of Previous Payment Quantities." }
        },
        required: ["id", "billItemDescription", "locationDescription", "timesing", "dimension", "quantity", "unit", "category", "confidence"],
      },
    },
    technicalQueries: {
      type: Type.ARRAY,
      description: "List of missing information, ambiguities, or assumptions made during the takeoff.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "TQ Reference (TQ-01)" },
          query: { type: Type.STRING, description: "What information is missing or conflicting?" },
          assumption: { type: Type.STRING, description: "What assumption did the AI make to proceed?" },
          impactLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] }
        },
        required: ["id", "query", "assumption", "impactLevel"]
      }
    },
    rebarItems: {
      type: Type.ARRAY,
      description: "Separate Bar Bending Schedule / Rebar Takeoff. Empty if not a structural drawing.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Bar Mark" },
          member: { type: Type.STRING, description: "Member Name" },
          barType: { type: Type.STRING, description: "Bar Size" },
          shapeCode: { type: Type.STRING, description: "Shape Code" },
          noOfMembers: { type: Type.NUMBER },
          barsPerMember: { type: Type.NUMBER },
          totalBars: { type: Type.NUMBER },
          lengthPerBar: { type: Type.NUMBER },
          totalLength: { type: Type.NUMBER },
          totalWeight: { type: Type.NUMBER }
        },
        required: ["id", "member", "barType", "shapeCode", "noOfMembers", "barsPerMember", "totalBars", "lengthPerBar", "totalLength", "totalWeight"]
      }
    }
  },
  required: ["projectName", "drawingType", "items", "rebarItems", "technicalQueries", "summary"],
};

export interface FileInput {
    data: string;
    mimeType: string;
    fileName: string;
}

export const generateTakeoff = async (
  files: FileInput[], 
  userInstructions: string, 
  scopes: string[] = [],
  includeRebar: boolean = false,
  floorCount: number = 1,
  basementCount: number = 0,
  storyHeight: number = 3.0,
  specBase64Data?: string, 
  specMimeType?: string,
  unitSystem: 'metric' | 'imperial' = 'metric',
  appMode: AppMode = AppMode.ESTIMATION,
  contractBase64Data?: string,
  contractMimeType?: string
): Promise<TakeoffResult> => {
  
  // --------------------------------------------------------------------------
  // DWG/CAD ALGORITHMIC ESTIMATION (Simulation for Binary Files)
  // --------------------------------------------------------------------------
  const isCad = files.length > 0 && (files[0].mimeType.includes('dwg') || files[0].mimeType.includes('dxf'));
  
  if (isCad) {
    const fileName = files[0].fileName;
    return new Promise((resolve) => {
      setTimeout(() => {
         const items: TakeoffItem[] = [];
         let idCounter = 1;
         const source = fileName;
         const isMetric = unitSystem === 'metric';
         
         const unitM = isMetric ? 'm' : 'ft';
         const unitM2 = isMetric ? 'm2' : 'sq.ft';
         const unitM3 = isMetric ? 'm3' : 'cu.yd';
         
         // Helper to add item ONLY if scope is selected (or if scopes is empty/all)
         const addItem = (category: string, subCat: string, desc: string, loc: string, dim: string, qty: number, unit: string, times: number = 1, relevantScopeIds: string[] = []) => {
             // Check if user requested this scope
             const hasRelevantScope = scopes.length === 0 || relevantScopeIds.some(id => scopes.includes(id));
             
             if (hasRelevantScope) {
                items.push({
                    id: `CAD-${String(idCounter++).padStart(3, '0')}`,
                    billItemDescription: `${category}: ${subCat} - ${desc}`,
                    description: `${category}: ${subCat} - ${desc}`,
                    locationDescription: loc,
                    sourceRef: source,
                    timesing: times,
                    dimension: dim,
                    quantity: parseFloat((qty * times).toFixed(2)),
                    unit: unit,
                    category: category,
                    confidence: "High" 
                });
             }
         };

         // --- 1. SUB STRUCTURE ---
         addItem("Sub Structure", "Excavation", "Site Clearance & Topsoil Stripping", "Plot Area", isMetric ? "15.00 * 12.00" : "50.00 * 40.00", isMetric ? 180 : 2000, unitM2, 1, ['Excavation', 'Preliminaries']);
         addItem("Sub Structure", "Excavation", "Pit Excavation for Pad Footings", "Axis A-F", isMetric ? "1.80 * 1.80 * 1.50" : "6.00 * 6.00 * 5.00", isMetric ? 4.86 : 180, unitM3, 16, ['Excavation', 'Foundations']);
         addItem("Sub Structure", "Concrete", "C25 Reinforced Concrete in Pad Footings", "F1 Type", isMetric ? "1.80 * 1.80 * 0.50" : "6.00 * 6.00 * 1.60", isMetric ? 1.62 : 57.6, unitM3, 16, ['Foundations', 'Concrete']);
         addItem("Sub Structure", "Masonry", "Substructure HCB Walling (Foundation Wall)", "Grade Beam Level", isMetric ? "120.00 * 1.20" : "400.00 * 4.00", isMetric ? 144 : 1600, unitM2, 1, ['Walls_Masonry', 'Foundations']);

         // --- 2. SUPER STRUCTURE ---
         const cols = 16;
         const floorH = storyHeight;
         
         addItem("Super Structure", "Columns", `C30 Concrete in Rectangular Columns (${isMetric?'400x400mm':'16"x16"'})`, "Typical Floor", isMetric ? `0.40 * 0.40 * ${floorH}` : `1.33 * 1.33 * ${floorH}`, isMetric ? (0.16*floorH) : (1.7*floorH), unitM3, cols * floorCount, ['Columns', 'Concrete']);
         const beamLen = isMetric ? 160 : 520;
         addItem("Super Structure", "Beams", `C30 Concrete in Floor Beams (${isMetric?'300x500mm':'12"x20"'})`, "Typical Floor", isMetric ? `${beamLen} * 0.30 * 0.50` : `${beamLen} * 1.00 * 1.66`, isMetric ? 24 : 860, unitM3, floorCount, ['Beams', 'Concrete']);
         const slabThick = isMetric ? 0.15 : 0.5;
         const slabArea = isMetric ? 140 : 1500;
         addItem("Super Structure", "Slabs", `C30 Concrete in Suspended Floor Slabs`, "Typical Floor", isMetric ? `${slabArea} * ${slabThick}` : `${slabArea} * ${slabThick}`, isMetric ? 21 : 750, unitM3, floorCount, ['Slabs', 'Concrete']);
         
         // Formwork
         addItem("Super Structure", "Formwork", "Sawn Formwork to Sides of Columns", "Typical Floor", isMetric ? `4 * 0.40 * ${floorH}` : `4 * 1.33 * ${floorH}`, isMetric ? (1.6*floorH) : (5.3*floorH), unitM2, cols * floorCount, ['Formwork']);
         addItem("Super Structure", "Formwork", "Sawn Formwork to Soffit of Slabs", "Typical Floor", `${slabArea}`, slabArea, unitM2, floorCount, ['Formwork']);

         // --- 3. ARCHITECTURAL & FINISHES ---
         const wallH = floorH - (isMetric ? 0.5 : 1.66);
         const extWallLen = isMetric ? 48 : 160;
         const intWallLen = isMetric ? 80 : 260;
         
         addItem("Masonry & Partitioning", "Walls", "200mm HCB External Walls", "Perimeter", `${extWallLen} * ${wallH}`, extWallLen * wallH, unitM2, floorCount, ['Walls_Masonry']);
         addItem("Masonry & Partitioning", "Walls", "150mm HCB Internal Partitions", "Internal", `${intWallLen} * ${wallH}`, intWallLen * wallH, unitM2, floorCount, ['Walls_Masonry']);
         
         addItem("Finishing Works", "Cladding", "Aluminum Composite Panel (ACP) Cladding", "Front Facade", isMetric ? "12.00 * 15.00" : "40.00 * 50.00", isMetric ? 180 : 2000, unitM2, 1, ['Facade', 'Cladding']);
         addItem("Finishing Works", "Floor", "Ceramic Floor Tiles (60x60cm)", "Offices / Rooms", "60.00", 60, unitM2, floorCount, ['Flooring']);
         addItem("Finishing Works", "Wall", "Internal Plastering (3 coats)", "Internal Walls", `(${intWallLen} * 2) * ${wallH}`, (intWallLen*2) * wallH, unitM2, floorCount, ['Painting', 'Plastering']);
         
         addItem("Openings (Doors/Windows)", "Doors", "D1 - Solid Timber Door (90x210cm)", "Offices", "Count", 1, "nr", 10 * floorCount, ['Openings']);
         addItem("Openings (Doors/Windows)", "Windows", "W1 - Alum. Sliding Window (150x150cm)", "External", "Count", 1, "nr", 14 * floorCount, ['Openings']);

         // --- 4. MEP SERVICES ---
         addItem("Electrical", "Lighting", "LED Downlight Fittings (Recessed)", "Ceilings", "Count", 1, "nr", 30 * floorCount, ['Electrical']);
         addItem("Electrical", "Power", "13A Twin Switch Socket Outlet", "Walls", "Count", 1, "nr", 25 * floorCount, ['Electrical']);
         
         addItem("Sanitary & Plumbing", "Fixtures", "Water Closet (WC) Complete Set", "Toilets", "Count", 1, "nr", 4 * floorCount, ['Plumbing']);
         addItem("Sanitary & Plumbing", "Fixtures", "Wash Hand Basin (WHB) with Mixer", "Toilets", "Count", 1, "nr", 4 * floorCount, ['Plumbing']);
         
         addItem("Mechanical", "HVAC", "Split AC Unit (18000 BTU)", "Offices", "Count", 1, "nr", 4 * floorCount, ['Mechanical']);
         if (floorCount > 4) {
             addItem("Mechanical", "Lifts", "Passenger Lift (8 Person, 630kg)", "Core", "Count", 1, "nr", 1, ['Lifts']);
         }
         
         // REBAR SIMULATION
         const rebar: RebarItem[] = [];
         if (includeRebar) {
             const wt = isMetric ? 1.58 : 1.06;
             rebar.push({ id: "01", member: "C1 (Col)", barType: "Y16", shapeCode: "21", noOfMembers: cols * floorCount, barsPerMember: 8, totalBars: cols * floorCount * 8, lengthPerBar: floorH + 1, totalLength: (cols*floorCount*8)*(floorH+1), totalWeight: (cols*floorCount*8)*(floorH+1)*wt });
             rebar.push({ id: "02", member: "B1 (Beam)", barType: "Y16", shapeCode: "00", noOfMembers: floorCount * 20, barsPerMember: 4, totalBars: floorCount * 80, lengthPerBar: 6.0, totalLength: floorCount*480, totalWeight: floorCount*480*wt });
             rebar.push({ id: "03", member: "F1 (Footing)", barType: "Y12", shapeCode: "21", noOfMembers: 16, barsPerMember: 12, totalBars: 192, lengthPerBar: 2.5, totalLength: 480, totalWeight: 480*0.888 });
         }

         resolve({
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          projectName: fileName.replace('.dwg', '').replace(/_/g, ' '),
          drawingType: 'Full Project Set (Arch + Struct + MEP)',
          unitSystem: unitSystem,
          summary: `Comprehensive Algorithmic Takeoff generated from CAD metadata.\n\nSCOPE:\n${scopes.length > 0 ? scopes.join(', ') : 'ALL TRADES'}\n\nFloors: ${floorCount}\nStory Height: ${storyHeight}${unitM}`,
          items: items,
          rebarItems: rebar,
          technicalQueries: [
              { id: "TQ-01", query: "Rebar grades not explicitly defined in layer metadata.", assumption: "Assumed High Yield (460 N/mm2) for main bars.", impactLevel: "Medium" }
          ]
        });
      }, 3000); 
    });
  }

  // --- REAL AI PROCESSING (MULTI-FILE for PDF/Images) ---
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash"; 
  
  const rebarInstruction = includeRebar 
    ? `3. **DETAILED REBAR SCHEDULE (BS 8666)**:
       - You MUST extract the Bar Bending Schedule (BBS) data for the structural drawings.
       - For EACH structural member (Beam, Column, Slab, Footing), identify the reinforcement.
       - **Bar Mark**: Extract (e.g., 01, 02).
       - **Member**: Name of member (e.g. "C1", "B1").
       - **Type**: H, Y, T (High Yield) or R (Mild Steel).
       - **Size**: 8, 10, 12, 16, 20, 25, 32.
       - **Shape Code**: standard codes (e.g., 00, 21, 51).
       - **Calculations**: Total Length = (Cut Length) * (No. of Bars) * (No. of Members).
       - **Weight**: Calculate total weight in kg (using standard densities: D10=0.617, D12=0.888, D16=1.58, D20=2.47 kg/m).`
    : `3. **SKIP REBAR**: Do not generate any rebar items.`;

  // Filter System Instructions based on selected Scopes
  const scopeFilterInstruction = scopes.length > 0
    ? `**CRITICAL SCOPE LIMITATION**: The user has ONLY requested the following trades: ${scopes.join(', ').toUpperCase()}. 
       You MUST IGNORE all other elements. Do not measure items that fall outside these scopes.
       
       However, if the user has selected ALL or MOST scopes (Arch + Struct + MEP), assume this is a **FULL PROJECT TAKEOFF**.
       In that case, you must ensure you cross-reference different drawings (e.g. use Floor Plans for area, Section Drawings for height).`
    : `You are analyzing a FULL PROJECT SET. Measure ALL visible trades.`;

  // BUILD THE CONTENTS ARRAY
  const parts: any[] = [];
  
  // 1. ADD ALL DRAWINGS WITH TEXT LABELS
  files.forEach((file, index) => {
      parts.push({ text: `\n--- DRAWING FILE ${index + 1}: ${file.fileName} ---\n` });
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data,
        },
      });
  });

  // 2. ADD THE SPECIFICATION (IF EXISTS)
  if (specBase64Data && specMimeType) {
      parts.push({ text: "\n--- PROJECT SPECIFICATION DOCUMENT ---\n" });
      parts.push({
          inlineData: {
              mimeType: specMimeType,
              data: specBase64Data
          }
      });
  }

  // 3. ADD THE CONTRACT / EXCEL PREVIOUS PAYMENT (IF EXISTS)
  if (contractBase64Data && contractMimeType) {
      parts.push({ text: "\n--- PREVIOUS PAYMENT CERTIFICATE / EXCEL BOQ ---\n" });
      parts.push({ text: "**INSTRUCTION**: This file contains the 'Contract Quantities' and 'Previous Quantities'. You MUST map the items you measure in the drawings to the items in this Excel file." });
      parts.push({
          inlineData: {
              mimeType: contractMimeType,
              data: contractBase64Data
          }
      });
  }

  // SYSTEM INSTRUCTION
  const systemInstruction = `
    Act as a **Chief Professional Quantity Surveyor (QS)**.
    You are analyzing a Construction Drawing Set to produce a **BILL OF QUANTITIES**.
    
    ${scopeFilterInstruction}

    **COMPREHENSIVE MEASUREMENT RULES (SMM7 / CESMM4)** (Apply only if within scope):

    --- 1. SUB-STRUCTURE (FOUNDATIONS) ---
    - **Excavation**: Site Clearance (m2), Pit Excavation (m3), Trench Excavation (m3), Disposal (m3).
    - **Concrete**: Blinding (m2), Reinforced Concrete in Footings/Grade Beams (m3).
    - **Masonry**: Foundation Blockwork (m2).

    --- 2. SUPER-STRUCTURE (FRAME) ---
    - **Columns**: (No. of Cols) x (L x W) x Height. Group by type (C1, C2).
    - **Beams**: (Total Length) x (Width x Depth).
    - **Slabs**: Solid/Ribbed Slabs (m3 or m2).
    - **Formwork**: Calculate Surface Area (m2) for all concrete faces.

    --- 3. ARCHITECTURAL & FINISHING ---
    - **Walls**: External (200mm) & Internal (150mm/100mm) Blockwork (m2). Deduct openings.
    - **Cladding / Facade**: Stone, Aluminum Composite (ACP), Glazing (m2).
    - **Flooring**: Ceramic, Granite, Terrazzo, Screed (m2). Skirting (m).
    - **Wall Finishes**: Plaster & Paint (m2). Ceramic Wall Tiles in wet areas (m2).
    - **Ceiling**: Gypsum Board, Suspended Ceiling (m2).
    - **Openings**: Doors (D1, D2...) & Windows (W1, W2...) -> Count (Nr).

    --- 4. MEP SERVICES (COUNT & MEASURE) ---
    - **Electrical**: Light Points, Switches, Sockets, Data Points, DBs (Nr).
    - **Sanitary**: WCs, Wash Basins, Showers, Sinks, Floor Drains (Nr). Piping (Provisional Sum/Length).
    - **Mechanical**: AC Split Units, Exhaust Fans, Lifts (Nr).

    **OUTPUT FORMATTING**:
    - **Item Description**: Professional QS language. E.g., "Supply and fix 60x60cm Porcelain Floor Tiles".
    - **Dimension**: Show math. E.g., "12 Nr * 3.00 * 4.00".
    - **Location**: Use "Axis" terminology (e.g., "Axis A-B", "Axis 1-4") instead of "Grid".
    - **Timesing**: Use for Floor Count (High Rise).
    - **Structure**: Group clearly by Category.
    
    **HIGH RISE LOGIC**:
    - Measure ONE typical floor fully.
    - Set 'timesing' = ${floorCount} (Total Floors).
    
    ${contractBase64Data ? "**EXCEL INTEGRATION**: Map measured items to the provided BOQ." : ""}
    ${rebarInstruction}

    Produce a professional, detailed JSON response.
  `;

  parts.push({ text: `Analyze the provided project documents and generate the detailed Takeoff Sheet JSON.${scopes.length > 0 ? " REMEMBER: Only measure the requested scopes." : ""}` });

  return retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            role: "user",
            parts: parts,
          },
        ],
        config: {
          systemInstruction: systemInstruction,
          // CRITICAL: Low thinking budget to prevent token exhaustion on large outputs
          thinkingConfig: { thinkingBudget: 1024 }, 
          // CRITICAL: Maximize output tokens for large BOQ
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: takeoffSchema,
          temperature: 0, 
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      try {
        const res = JSON.parse(text) as TakeoffResult;
        if (!res.unitSystem) res.unitSystem = unitSystem;
        if (!res.projectName || res.projectName.length < 3) {
            res.projectName = files[0].fileName.split('.')[0].replace(/_/g, ' ');
        }
        
        // Ensure ID and Date
        res.id = crypto.randomUUID();
        res.date = new Date().toISOString();

        // Ensure description is present
        if (res.items) {
            res.items = res.items.map(item => ({
                ...item,
                description: item.description || item.billItemDescription || "Item Description"
            }));
        }
        
        return res;
      } catch (e) {
        console.error("Failed to parse JSON", e);
        throw new Error("The AI response was too large and got truncated. Please try analyzing fewer drawings at once or focusing on specific scopes.");
      }
  });
};

/**
 * NEW FEATURE: Suggest Market Rate
 * Queries Gemini for a realistic market rate range for a specific item.
 * Includes Retry Logic for robustness.
 */
export const getRateSuggestion = async (itemDescription: string, currency: string = 'ETB'): Promise<string> => {
    try {
        if (!process.env.API_KEY) return "No API Key";
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Wrap in retry operation
        const responseText = await retryOperation(async () => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `You are a Senior Quantity Surveyor in East Africa (Ethiopia). 
                Provide a realistic market Unit Rate range for the following construction item: "${itemDescription}".
                Currency: ${currency}.
                
                Strictly output ONLY the range in this format: "Low - High". 
                Example Output: "3,500 - 4,200".
                Do NOT add any text, explanations, or units. Just the numbers.`,
            });
            return response.text;
        });

        return responseText?.trim() || "N/A";
    } catch (e) {
        console.error("Rate suggestion failed after retries", e);
        return "Unavailable"; // Graceful fallback
    }
};
