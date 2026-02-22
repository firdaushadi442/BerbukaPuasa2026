import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { Upload, CheckCircle, AlertCircle, Loader2, ChevronDown, ArrowLeft } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { CSV_URL, PRICING, BANK_DETAILS } from '../lib/constants';
import { checkSubmissionStatus, submitPayment } from '../lib/api';
import type { FamilyData } from '../types';
import { cn } from '../lib/utils';

export default function Payment() {
  const navigate = useNavigate();
  const [families, setFamilies] = useState<FamilyData[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilyData | null>(null);
  const [isLoadingCSV, setIsLoadingCSV] = useState(true);
  const [csvError, setCsvError] = useState('');
  
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState('');
  
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCSV();
  }, []);

  const fetchCSV = async () => {
    try {
      setIsLoadingCSV(true);
      const response = await fetch(CSV_URL);
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as string[][];
          // Assuming row 0 is header, start from row 1
          const parsedFamilies: FamilyData[] = [];
          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (row.length >= 4 && row[1]) { // Column B is index 1
              parsedFamilies.push({
                name: row[1].trim(),
                adults: parseInt(row[2]) || 0, // Column C is index 2
                children: parseInt(row[3]) || 0 // Column D is index 3
              });
            }
          }
          
          // Sort alphabetically
          parsedFamilies.sort((a, b) => a.name.localeCompare(b.name));
          setFamilies(parsedFamilies);
          setIsLoadingCSV(false);
        },
        error: (error: any) => {
          console.error('Error parsing CSV:', error);
          setCsvError('Gagal memuat turun senarai keluarga. Sila cuba sebentar lagi.');
          setIsLoadingCSV(false);
        }
      });
    } catch (error) {
      console.error('Error fetching CSV:', error);
      setCsvError('Gagal menyambung ke pangkalan data. Sila pastikan anda mempunyai sambungan internet.');
      setIsLoadingCSV(false);
    }
  };

  const handleFamilyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const familyName = e.target.value;
    if (!familyName) {
      setSelectedFamily(null);
      setHasSubmitted(false);
      return;
    }

    const family = families.find(f => f.name === familyName) || null;
    setSelectedFamily(family);
    
    if (family) {
      setIsCheckingStatus(true);
      setHasSubmitted(false);
      setSubmitError('');
      
      try {
        const res = await checkSubmissionStatus(family.name);
        if (res.success && res.submitted) {
          setHasSubmitted(true);
          setSubmissionStatus(res.status);
        } else if (res.error === 'fetch_failed') {
          setSubmitError('Gagal menyambung ke pangkalan data. Sila pastikan Google Apps Script telah di-deploy dengan akses "Anyone".');
        }
      } catch (error) {
        console.error('Failed to check status', error);
        setSubmitError('Ralat sistem semasa menyemak status.');
      } finally {
        setIsCheckingStatus(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate size (50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setSubmitError('Saiz fail melebihi 50MB. Sila pilih fail yang lebih kecil.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setSubmitError('Format fail tidak disokong. Sila muat naik JPG, PNG, atau PDF.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSubmitError('');
    setFile(selectedFile);
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '');
        if ((encoded?.length || 0) % 4 > 0) {
          encoded += '='.repeat(4 - (encoded?.length || 0) % 4);
        }
        resolve(encoded || '');
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFamily) {
      setSubmitError('Sila pilih nama keluarga.');
      return;
    }
    
    if (!file) {
      setSubmitError('Sila muat naik resit pembayaran.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const base64File = await getBase64(file);
      const totalAmount = (selectedFamily.adults * PRICING.ADULT) + (selectedFamily.children * PRICING.CHILD);
      
      let extractedAmount = '';
      let initialStatus = 'MENUNGGU PENGESAHAN';

      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64File,
                  mimeType: file.type
                }
              },
              {
                text: 'Extract the total payment amount from this receipt. Return ONLY the number (e.g., 144). If you cannot find it, return 0.'
              }
            ]
          }
        });
        
        const text = response.text?.trim() || '0';
        const amountMatch = text.match(/\d+(\.\d+)?/);
        if (amountMatch) {
          extractedAmount = amountMatch[0];
          if (parseFloat(extractedAmount) === totalAmount) {
            initialStatus = 'LULUS';
          }
        }
      } catch (aiError) {
        console.error('AI extraction failed:', aiError);
        // Continue with submission even if AI fails
      }
      
      const payload = {
        familyName: selectedFamily.name,
        adults: selectedFamily.adults,
        children: selectedFamily.children,
        totalAmount,
        receiptBase64: base64File,
        mimeType: file.type,
        filename: file.name,
        status: initialStatus,
        extractedAmount: extractedAmount
      };

      const res = await submitPayment(payload);
      
      if (res.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(res.message || 'Ralat semasa menghantar pembayaran.');
        if (res.message?.includes('telah menghantar')) {
          setHasSubmitted(true);
        }
      }
    } catch (error) {
      setSubmitError('Ralat sistem. Sila cuba sebentar lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-emerald-900 border border-emerald-800 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-20 h-20 bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-amber-400 mb-4 font-serif">Alhamdulillah!</h2>
          <p className="text-emerald-100 mb-8">
            Resit pembayaran untuk keluarga <strong className="text-white">{selectedFamily?.name}</strong> telah berjaya dihantar dan sedang <strong>Menunggu Pengesahan</strong>.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Kembali ke Laman Utama
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = selectedFamily ? (selectedFamily.adults * PRICING.ADULT) + (selectedFamily.children * PRICING.CHILD) : 0;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-emerald-400 hover:text-amber-400 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      <div className="bg-emerald-900/80 backdrop-blur-sm border border-emerald-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-emerald-950/50 p-6 md:p-8 border-b border-emerald-800/50">
          <h2 className="text-2xl md:text-3xl font-bold text-amber-400 font-serif">Borang Pembayaran</h2>
          <p className="text-emerald-200/70 mt-2">Sila lengkapkan maklumat di bawah untuk pengesahan kehadiran.</p>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Section 1: Family Selection */}
          <section>
            <label className="block text-sm font-medium text-emerald-200 mb-2">
              1. Pilih Nama Keluarga
            </label>
            
            {isLoadingCSV ? (
              <div className="flex items-center gap-3 text-emerald-400 bg-emerald-950/50 p-4 rounded-xl border border-emerald-800/50">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memuat turun senarai keluarga...</span>
              </div>
            ) : csvError ? (
              <div className="flex items-start gap-3 text-red-400 bg-red-950/30 p-4 rounded-xl border border-red-900/50">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{csvError}</span>
              </div>
            ) : (
              <div className="relative">
                <select 
                  className="w-full bg-emerald-950 border border-emerald-700 text-white rounded-xl p-4 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                  onChange={handleFamilyChange}
                  value={selectedFamily?.name || ''}
                  disabled={isCheckingStatus || isSubmitting}
                >
                  <option value="">-- Sila Pilih Nama Keluarga --</option>
                  {families.map((family, idx) => (
                    <option key={idx} value={family.name}>{family.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 pointer-events-none" />
              </div>
            )}
          </section>

          {isCheckingStatus && (
            <div className="flex items-center justify-center py-8 text-amber-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}

          {selectedFamily && !isCheckingStatus && (
            <>
              {hasSubmitted ? (
                <div className="bg-red-950/40 border border-red-900/50 rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-red-300 mb-2">Pemberitahuan</h3>
                  <p className="text-red-200/80 mb-4">
                    Keluarga ini telah menghantar resit pembayaran. Sila hubungi pihak penganjur jika terdapat kesilapan.
                  </p>
                  <div className="inline-block bg-red-950 border border-red-900 px-4 py-2 rounded-lg text-sm text-red-300">
                    Status Semasa: <strong className="uppercase">{submissionStatus || 'MENUNGGU PENGESAHAN'}</strong>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Section 2: Calculation */}
                  <section className="bg-emerald-950/40 rounded-2xl p-6 border border-emerald-800/50">
                    <h3 className="text-sm font-medium text-emerald-200 mb-4">2. Ringkasan Bayaran</h3>
                    
                    <div className="space-y-3 font-mono text-sm md:text-base">
                      <div className="flex justify-between items-center pb-3 border-b border-emerald-800/50">
                        <span className="text-emerald-100">Dewasa ({selectedFamily.adults} × RM{PRICING.ADULT})</span>
                        <span className="text-white">RM {selectedFamily.adults * PRICING.ADULT}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-emerald-800/50">
                        <span className="text-emerald-100">Kanak-kanak ({selectedFamily.children} × RM{PRICING.CHILD})</span>
                        <span className="text-white">RM {selectedFamily.children * PRICING.CHILD}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 text-lg md:text-xl font-bold">
                        <span className="text-amber-400">Jumlah Bayaran</span>
                        <span className="text-amber-400">RM {totalAmount}</span>
                      </div>
                    </div>
                  </section>

                  {/* Section 3: Payment Info */}
                  <section className="bg-emerald-950/40 rounded-2xl p-6 border border-emerald-800/50">
                    <h3 className="text-sm font-medium text-emerald-200 mb-4">3. Maklumat Akaun Bank</h3>
                    
                    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                      <div className="shrink-0 bg-white p-2 rounded-xl">
                        <img 
                          src={BANK_DETAILS.qrCodeUrl} 
                          alt="DuitNow QR" 
                          className="w-40 h-40 object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <div className="space-y-3 flex-1 w-full">
                        <div>
                          <p className="text-xs text-emerald-400 uppercase tracking-wider">Nama Bank</p>
                          <p className="font-medium text-white">{BANK_DETAILS.bankName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-emerald-400 uppercase tracking-wider">No Akaun</p>
                          <p className="font-mono text-lg text-amber-400">{BANK_DETAILS.accountNo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-emerald-400 uppercase tracking-wider">Nama Akaun</p>
                          <p className="font-medium text-white">{BANK_DETAILS.accountName}</p>
                        </div>
                        <div className="bg-emerald-900/50 p-3 rounded-lg border border-emerald-800 mt-2">
                          <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Reference / Rujukan (Wajib)</p>
                          <p className="font-mono text-white text-sm break-all">PASTI {selectedFamily.name}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Section 4: Upload */}
                  <section>
                    <h3 className="text-sm font-medium text-emerald-200 mb-4">4. Muat Naik Resit</h3>
                    
                    <div className="relative">
                      <input 
                        type="file" 
                        id="receipt" 
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="hidden"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        disabled={isSubmitting}
                      />
                      <label 
                        htmlFor="receipt"
                        className={cn(
                          "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-colors",
                          file ? "border-amber-500 bg-amber-500/5" : "border-emerald-700 hover:border-amber-500/50 hover:bg-emerald-900/50 bg-emerald-950/30",
                          isSubmitting && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {file ? (
                            <>
                              <CheckCircle className="w-10 h-10 text-amber-500 mb-3" />
                              <p className="text-sm text-amber-400 font-medium px-4 text-center truncate w-full max-w-xs">{file.name}</p>
                              <p className="text-xs text-emerald-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-10 h-10 text-emerald-500 mb-3" />
                              <p className="mb-2 text-sm text-emerald-200"><span className="font-semibold">Klik untuk muat naik</span> atau seret fail ke sini</p>
                              <p className="text-xs text-emerald-400/70">JPG, PNG atau PDF (Maks. 50MB)</p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </section>

                  {submitError && (
                    <div className="flex items-start gap-3 text-red-400 bg-red-950/30 p-4 rounded-xl border border-red-900/50">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !file}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all",
                      isSubmitting || !file 
                        ? "bg-emerald-800 text-emerald-500 cursor-not-allowed" 
                        : "bg-amber-500 hover:bg-amber-400 text-emerald-950 shadow-[0_0_15px_rgba(251,191,36,0.2)] hover:shadow-[0_0_25px_rgba(251,191,36,0.4)]"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Menghantar...
                      </>
                    ) : (
                      'Hantar Resit Pembayaran'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
