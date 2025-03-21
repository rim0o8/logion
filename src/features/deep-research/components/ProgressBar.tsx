
interface ProgressBarProps {
  progress: number;
}

export const ProgressBar = ({ progress }: ProgressBarProps) => {
  // 0-100の範囲に制限
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div 
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
        style={{ width: `${normalizedProgress}%` }}
      />
    </div>
  );
}; 