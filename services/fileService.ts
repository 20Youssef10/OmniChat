
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import * as XLSX from "xlsx";
import { Attachment } from "../types";

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const uploadFile = async (file: File, userId: string): Promise<Attachment> => {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 10MB limit.`);
    }

    // Helper to extract text content
    const getExtractedText = async () => {
        if (file.type === 'text/plain' || file.type === 'text/markdown' || file.type === 'text/csv' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            return await file.text();
        } else if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
            return await extractSpreadsheetText(file);
        }
        return undefined;
    };

    // Helper for local fallback
    const createLocalAttachment = async () => {
        const base64 = await readFileAsBase64(file);
        const text = await getExtractedText();
        return {
            type: file.type.startsWith('image/') ? 'image' : 'file',
            url: base64,
            name: file.name,
            mimeType: file.type,
            size: file.size,
            extractedText: text
        } as Attachment;
    };

    // If local guest, skip storage upload directly
    if (userId.startsWith('guest_local_')) {
        return createLocalAttachment();
    }

    // 1. Attempt Upload to Firebase Storage
    const timestamp = Date.now();
    const storagePath = `users/${userId}/uploads/${timestamp}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    
    try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        const extractedText = await getExtractedText();

        return {
            type: file.type.startsWith('image/') ? 'image' : 'file',
            url,
            name: file.name,
            mimeType: file.type,
            size: file.size,
            storagePath,
            extractedText
        };
    } catch (error: any) {
        console.warn("Firebase Storage upload failed (falling back to local processing):", error.message);
        // Fallback: Use local data URL if upload fails (offline, permissions, or retry limit)
        return createLocalAttachment();
    }
};

const extractSpreadsheetText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const csv = XLSX.utils.sheet_to_csv(sheet);
                resolve(csv);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(file);
    });
};

export const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
