export interface FamilyData {
  name: string;
  adults: number;
  children: number;
}

export interface SubmissionData {
  Timestamp: string;
  FamilyName: string;
  Adults: number;
  Children: number;
  TotalAmount: number;
  ReceiptUrl: string;
  Status: 'MENUNGGU PENGESAHAN' | 'LULUS' | 'DITOLAK';
  ExtractedAmount?: string;
  rowIndex: number;
}
