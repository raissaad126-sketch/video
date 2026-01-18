import React, { useState, useEffect, useRef } from 'react';
import { VideoJob, JobStatus } from './types';
import { generateVideoWithVeo, checkApiKeyAvailability, promptApiKeySelection } from './services/geminiService';
import { JobCard } from './components/JobCard';
import { Video, Plus, Trash2, StopCircle, Sparkles, Layers, Terminal, FileVideo } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(false);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Ref for the processing loop to access latest state without dependency cycles
  const processingRef = useRef<boolean>(false);

  // Initial Check for API Key
  useEffect(() => {
    const initCheck = async () => {
      try {
        const hasKey = await checkApiKeyAvailability();
        setApiKeyReady(hasKey);
      } catch (e) {
        console.error("Failed to check API key status", e);
      }
    };
    initCheck();
  }, []);

  const handleConnect = async () => {
    try {
      await promptApiKeySelection();
      // Assume success if no error thrown, but re-check to be safe
      const hasKey = await checkApiKeyAvailability();
      setApiKeyReady(true); // Optimistically set true as per instructions
    } catch (e) {
      console.error("Key selection failed", e);
      alert("Failed to connect API Key. Please try again.");
    }
  };

  // Add Jobs
  const handleAddJobs = () => {
    if (!inputPrompt.trim()) return;

    const lines = inputPrompt.split('\n').filter(line => line.trim().length > 0);
    const newJobs: VideoJob[] = lines.map(line => ({
      id: crypto.randomUUID(),
      prompt: line.trim(),
      status: JobStatus.PENDING,
      createdAt: Date.now(),
    }));

    setJobs(prev => [...prev, ...newJobs]);
    setInputPrompt("");
  };

  // Queue Processor
  useEffect(() => {
    const processQueue = async () => {
      if (processingRef.current) return;
      
      // Find the next pending job
      const nextJobIndex = jobs.findIndex(j => j.status === JobStatus.PENDING);
      
      if (nextJobIndex === -1) {
        setIsProcessing(false);
        return;
      }

      // Start processing
      processingRef.current = true;
      setIsProcessing(true);
      const job = jobs[nextJobIndex];

      // Update status to PROCESSING
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: JobStatus.PROCESSING } : j));

      try {
        if (!apiKeyReady) {
            throw new Error("API Key not connected");
        }
        
        const result = await generateVideoWithVeo(job.prompt);
        
        // Update to COMPLETED
        setJobs(prev => prev.map(j => j.id === job.id ? { 
            ...j, 
            status: JobStatus.COMPLETED, 
            videoUrl: result.videoUrl,
            videoBlob: result.videoBlob,
            completedAt: Date.now()
        } : j));

      } catch (error: any) {
        console.error(`Job ${job.id} failed:`, error);
        
        // If "Requested entity was not found", reset API key state
        if (error.message && error.message.includes("Requested entity was not found")) {
            setApiKeyReady(false);
        }

        // Update to FAILED
        setJobs(prev => prev.map(j => j.id === job.id ? { 
            ...j, 
            status: JobStatus.FAILED, 
            error: error.message || "Generation failed" 
        } : j));
      } finally {
        processingRef.current = false;
        // Trigger next pass immediately
        processQueue();
      }
    };

    if (jobs.some(j => j.status === JobStatus.PENDING)) {
        processQueue();
    }
  }, [jobs, apiKeyReady]);


  const retryJob = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: JobStatus.PENDING, error: undefined } : j));
  };

  const deleteJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all jobs?")) {
        setJobs([]);
    }
  };

  // Calculations
  const completedCount = jobs.filter(j => j.status === JobStatus.COMPLETED).length;
  const pendingCount = jobs.filter(j => j.status === JobStatus.PENDING).length;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 p-4 md:p-8 font-sans selection:bg-primary-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
              <Video className="w-8 h-8 text-primary-500" />
              VeoBatch <span className="text-sm font-medium text-gray-500 border border-gray-700 px-2 py-0.5 rounded-full">3.1 1080p</span>
            </h1>
            <p className="text-gray-400 text-sm">Bulk Cinematic Video Generation Pipeline</p>
          </div>
          
          <div className="flex items-center gap-3">
            {!apiKeyReady ? (
              <button 
                onClick={handleConnect}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
              >
                <Terminal className="w-4 h-4" />
                Connect Google AI Key
              </button>
            ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-900/20 border border-green-800/50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-green-400 font-medium">System Online</span>
                </div>
            )}
          </div>
        </header>

        {!apiKeyReady ? (
           <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-2xl bg-gray-900/20">
              <Layers className="w-16 h-16 text-gray-700 mb-4" />
              <h2 className="text-xl font-semibold text-gray-300">Authentication Required</h2>
              <p className="text-gray-500 max-w-md text-center mt-2 mb-6">
                To generate high-quality 1080p videos with Veo 3.1, you must connect a billed Google Cloud Project API key.
              </p>
              <button 
                onClick={handleConnect}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
              >
                Select API Key via AI Studio
              </button>
              <p className="mt-4 text-xs text-gray-600">
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-gray-400">
                    Read Billing Documentation
                </a>
              </p>
           </div>
        ) : (
            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Input Column */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-500" />
                                New Batch
                            </h2>
                            <span className="text-xs text-gray-500">One prompt per line</span>
                        </div>
                        
                        <textarea
                            value={inputPrompt}
                            onChange={(e) => setInputPrompt(e.target.value)}
                            placeholder={`A futuristic city with flying cars, neon lights, 8k\nA calm zen garden with cherry blossoms falling, cinematic\nCyberpunk detective walking in rain, highly detailed`}
                            className="w-full h-64 bg-black/50 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 resize-none font-mono"
                        />

                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={handleAddJobs}
                                disabled={!inputPrompt.trim()}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Add to Queue
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Pipeline Stats</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/40 p-3 rounded-lg border border-gray-800">
                                <span className="block text-2xl font-bold text-white">{pendingCount}</span>
                                <span className="text-xs text-gray-500">Pending</span>
                            </div>
                            <div className="bg-black/40 p-3 rounded-lg border border-gray-800">
                                <span className="block text-2xl font-bold text-green-400">{completedCount}</span>
                                <span className="text-xs text-gray-500">Completed</span>
                            </div>
                        </div>
                        {isProcessing && (
                             <div className="mt-4 flex items-center gap-2 text-xs text-blue-400 bg-blue-900/20 p-2 rounded border border-blue-900/50">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
                                Processing Queue...
                             </div>
                        )}
                    </div>
                </div>

                {/* Queue Column */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Production Queue</h2>
                        {jobs.length > 0 && (
                            <button 
                                onClick={clearAll}
                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-red-900/20 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear All
                            </button>
                        )}
                    </div>

                    <div className="space-y-4 min-h-[400px]">
                        {jobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-800 rounded-2xl text-gray-600">
                                <FileVideo className="w-12 h-12 mb-3 opacity-20" />
                                <p>Queue is empty</p>
                                <p className="text-sm opacity-50">Add prompts to start generating</p>
                            </div>
                        ) : (
                            jobs.slice().reverse().map((job) => (
                                <JobCard 
                                    key={job.id} 
                                    job={job} 
                                    onRetry={retryJob}
                                    onDelete={deleteJob}
                                />
                            ))
                        )}
                    </div>
                </div>
            </main>
        )}
      </div>
    </div>
  );
};

export default App;