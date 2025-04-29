import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Get the current file path and directory for ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    // Get all sheets data
    const sheetsData = sheetNames.map(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      return {
        sheetName,
        data
      };
    });
    
    return sheetsData;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Error al analizar el archivo Excel');
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