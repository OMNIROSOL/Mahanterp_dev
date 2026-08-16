
import React, { useState } from 'react';
import { analyzeFinancialData } from '../services/geminiService';
import { Transaction } from '../types';

interface AIAssistantProps {
  transactions: Transaction[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ transactions }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await analyzeFinancialData(transactions);
    setAnalysis(result || "Error generating report.");
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
            <i className="fas fa-robot text-2xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold">CloudManager AI Assistant</h2>
            <p className="text-indigo-100 text-sm opacity-90">Instant financial insights powered by Gemini</p>
          </div>
        </div>
        <button 
          onClick={handleAnalyze}
          disabled={loading}
          className={`px-6 py-2 bg-white text-indigo-600 font-bold rounded-lg shadow-md hover:bg-indigo-50 transition flex items-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i> Thinking...
            </>
          ) : (
            <>
              <i className="fas fa-magic mr-2"></i> Generate Report
            </>
          )}
        </button>
      </div>

      {analysis && (
        <div className="mt-6 bg-white/10 rounded-lg p-5 backdrop-blur-md border border-white/20">
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="whitespace-pre-wrap leading-relaxed">
              {analysis}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
