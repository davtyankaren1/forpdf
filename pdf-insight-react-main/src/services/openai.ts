// Text correction utilities
import { toast } from '@/hooks/use-toast';

/**
 * Advanced text formatting and correction for PDF extracted text
 * @param text The text to correct
 * @returns Formatted and corrected text
 */
export const correctText = (text: string): string => {
  if (!text) return '';
  
  let formattedText = text;
  
  // Remove emojis
  formattedText = formattedText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  
  // Remove page break markers
  formattedText = formattedText.replace(/---\s*Page\s*Break\s*---/gi, '');
  
  // Remove bullet symbols but keep the text
  formattedText = formattedText.replace(/[\u2022\u25cf\u25a0\u25a1\u25aa\u25ab\u2043\u2219\u2022\u25e6\u25cb\u25cf\u25aa\u25ab\u2043\u2219]/g, '');
  formattedText = formattedText.replace(/[\u25b8\u25ba\u25bc\u25be\u25c2\u25c4\u25c6\u25c8\u25cb\u25ce\u25cf]/g, '');
  formattedText = formattedText.replace(/[\u25d0\u25d1\u25d2\u25d3\u25d4\u25d5\u25d6\u25d7\u25d8\u25d9\u25da\u25db\u25dc\u25dd\u25de\u25df]/g, '');
  formattedText = formattedText.replace(/[\u25e0\u25e1\u25e2\u25e3\u25e4\u25e5\u25e6\u25e7\u25e8\u25e9\u25ea\u25eb\u25ec\u25ed\u25ee\u25ef]/g, '');
  formattedText = formattedText.replace(/[\u2605\u2606\u260e\u2616\u2617\u2619\u261a\u261b\u261c\u261d\u261e\u261f]/g, '');
  formattedText = formattedText.replace(/[\u2660\u2661\u2662\u2663\u2664\u2665\u2666\u2667\u2668\u2669\u266a\u266b\u266c\u266d\u266e\u266f]/g, '');
  
  // Remove vertical bars
  formattedText = formattedText.replace(/[|]/g, '');
  
  // Remove hyphenated line breaks (words split across lines)
  formattedText = formattedText.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');
  
  // Join words with spaces between letters (e.g., "A d m i n" → "Admin")
  formattedText = formattedText.replace(/\b([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\b/g, '$1$2$3$4$5$6');
  formattedText = formattedText.replace(/\b([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\b/g, '$1$2$3$4$5');
  formattedText = formattedText.replace(/\b([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\b/g, '$1$2$3$4');
  formattedText = formattedText.replace(/\b([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\b/g, '$1$2$3');
  formattedText = formattedText.replace(/\b([A-Za-z])\s+([A-Za-z])\b/g, '$1$2');
  
  // Fix extra spaces
  formattedText = formattedText.replace(/\s+/g, ' ').trim();
  
  // Add paragraph breaks after sentences
  formattedText = formattedText.replace(/\.\s+([A-Z])/g, '.\n\n$1');
  
  // Add extra line breaks after date ranges (e.g., 2022-2025)
  formattedText = formattedText.replace(/(\d{4})\s*[-–—]\s*(\d{4}|Present|present|Current|current)\s*([^\n])/gi, '$1-$2\n\n$3');
  formattedText = formattedText.replace(/(\d{1,2}\/\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|Present|present|Current|current)\s*([^\n])/gi, '$1 - $2\n\n$3');
  
  // Add extra line breaks after common section headers in resumes/documents
  const sectionHeaders = [
    'Experience', 'Education', 'Skills', 'Languages', 'Projects', 'Certifications', 
    'References', 'Responsibilities', 'Achievements', 'Key responsibilities', 'Work Experience',
    'Professional Experience', 'Technical Skills', 'Soft Skills', 'Publications', 'Awards',
    'Volunteer Work', 'Interests', 'Hobbies', 'Contact Information', 'Summary', 'Objective',
    'Personal Statement', 'Professional Summary', 'Career Highlights'
  ];
  
  // Add line breaks after section headers
  const sectionHeadersRegex = new RegExp(`(${sectionHeaders.join('|')})\\s*:?\\s*([^\\n])`, 'gi');
  formattedText = formattedText.replace(sectionHeadersRegex, '$1:\n\n$2');
  
  // Fix multiple consecutive line breaks
  formattedText = formattedText.replace(/\n\s*\n\s*\n+/g, '\n\n');
  
  return formattedText;
};

/**
 * Legacy function to maintain compatibility with existing code
 * @param text The text to correct
 * @returns Promise with the corrected text
 */
export const correctTextWithAI = async (text: string): Promise<string> => {
  // Simply use the local correction function instead of AI
  return Promise.resolve(correctText(text));
};
