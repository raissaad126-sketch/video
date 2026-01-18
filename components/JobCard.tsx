import React from 'react';
import { VideoJob, JobStatus } from '../types';
import { Loader2, AlertCircle, CheckCircle2, Download, Play, Clock, FileVideo } from 'lucide-react';

interface JobCardProps {
  job: VideoJob;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onRetry, onDelete }) => {
  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.PENDING: return 'border-gray-700 bg-gray-800/50';
      case JobStatus.PROCESSING: return 'border-blue-500/50 bg-blue-900/10';
      case JobStatus.COMPLETED: return 'border-green-500/50 bg-green-900/10';
      case JobStatus.FAILED: return 'border-red-500/50 bg-red-900/10';
      default: return 'border-gray-700';
    }
  };

  const handleDownload = () => {
    if (job.videoUrl) {
      const a = document.createElement('a');
      a.href = job.videoUrl;
      a.download = `veo-video-${job.id.slice(0, 6)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className={`relative p-4 rounded-xl border ${getStatusColor(job.status)} transition-all duration-300 backdrop-blur-sm group`}>
      {/* Header Info */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">#{job.id.slice(0, 4)}</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                {job.status}
            </span>
        </div>
        <button 
            onClick={() => onDelete(job.id)}
            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove"
        >
            &times;
        </button>
      </div>

      {/* Content Area */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Status Icon / Video Preview */}
        <div className="w-full md:w-48 aspect-video bg-black/40 rounded-lg overflow-hidden flex items-center justify-center border border-gray-800 shrink-0">
          {job.status === JobStatus.PENDING && (
            <Clock className="w-8 h-8 text-gray-600" />
          )}
          
          {job.status === JobStatus.PROCESSING && (
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <span className="text-xs text-blue-300 animate-pulse">Generating...</span>
            </div>
          )}

          {job.status === JobStatus.FAILED && (
            <AlertCircle className="w-8 h-8 text-red-500" />
          )}

          {job.status === JobStatus.COMPLETED && job.videoUrl && (
            <video 
                src={job.videoUrl} 
                controls 
                className="w-full h-full object-cover"
                poster="https://picsum.photos/320/180?blur=5" // Placeholder poster until loaded
            />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
             <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">Prompt</h3>
             <p className="text-gray-100 text-sm leading-relaxed line-clamp-3 md:line-clamp-none">
                {job.prompt}
             </p>
          </div>

          {/* Actions & Meta */}
          <div className="mt-4 flex items-center gap-3">
            {job.status === JobStatus.COMPLETED && (
                <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-md transition-colors"
                >
                    <Download className="w-3.5 h-3.5" />
                    Download MP4
                </button>
            )}

            {job.status === JobStatus.FAILED && (
                <div className="flex flex-col gap-2 w-full">
                    <p className="text-xs text-red-400">{job.error || "Unknown error occurred"}</p>
                    <button 
                        onClick={() => onRetry(job.id)}
                        className="self-start px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-md transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}
            
            {job.completedAt && (
                <span className="text-xs text-gray-500 ml-auto">
                    {(job.completedAt - job.createdAt) / 1000}s duration
                </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};