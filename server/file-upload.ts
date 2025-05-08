import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { read, utils } from 'xlsx';

// Define __dirname equivalent for ESM
const __dirname = path.resolve();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename to prevent overwrites
    const uniqueFileName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueFileName);
  }
});

// Define file filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only Excel files for now (PDF support will be added later)
  if (
    file.mimetype === 'application/vnd.ms-excel' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mimetype === 'application/vnd.oasis.opendocument.spreadsheet'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no soportado. Solo se permiten archivos Excel.'));
  }
};

// Create multer upload instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

// Function to parse Excel file
export async function parseExcelFile(filePath: string) {
  try {
    // Read the workbook with more options for compatibility
    const workbook = read(filePath, { 
      type: 'file',
      cellDates: true,  // Parse dates as JS Date objects
      cellNF: false,    // Do not parse number formats
      cellText: false   // Do not generate text versions of cells
    });
    const sheetNames = workbook.SheetNames;
    
    if (sheetNames.length === 0) {
      throw new Error("El archivo Excel no contiene hojas de cálculo");
    }
    
    // Get all sheets data in multiple formats for better compatibility
    const sheetsData = sheetNames.map((sheetName: string) => {
      const worksheet = workbook.Sheets[sheetName];
      
      // Standard format (objects with header-based keys)
      const dataAsObjects = utils.sheet_to_json(worksheet, {
        defval: "", // Default value for empty cells
        blankrows: false // Skip completely empty rows
      });
      
      // Raw format (arrays with all columns)
      const dataAsArrays = utils.sheet_to_json(worksheet, {
        header: 1, // Use 1-indexed headers
        defval: "", // Default value for empty cells
        blankrows: false // Skip completely empty rows
      });
      
      // Format with raw cell addresses
      const range = utils.decode_range(worksheet['!ref'] || 'A1');
      const cellsMap: Record<string, any> = {};
      
      // Map of cell addresses to values, for direct access
      Object.keys(worksheet)
        .filter(key => key[0] !== '!')
        .forEach(addr => {
          const cell = worksheet[addr];
          cellsMap[addr] = cell.v; // Get raw value
        });
      
      return {
        sheetName,
        data: dataAsObjects,
        raw: dataAsArrays,
        cells: cellsMap,
        range: {
          startRow: range.s.r,
          endRow: range.e.r,
          startCol: range.s.c,
          endCol: range.e.c
        }
      };
    });
    
    console.log(`Excel file parsed successfully with ${sheetsData.length} sheets`);
    return sheetsData;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error(`Error al analizar el archivo Excel: ${(error as Error).message || 'Error desconocido'}`);
  }
}

// Function to parse PDF file - temporary stub until PDF handling is implemented
export async function parsePdfFile(filePath: string) {
  console.warn('PDF parsing not implemented yet');
  return {
    text: "PDF parsing not implemented yet",
    info: {},
    metadata: {},
    numberOfPages: 0
  };
}

// Helper function to clean up file after processing
export function cleanupFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
}