import React from 'react';

interface ProgressBarComponentProps {
  timer: string;
  progress: number;
  progressVisible: boolean;
}

const ProgressBarComponent: React.FC<ProgressBarComponentProps> = ({ timer, progress, progressVisible }) => {
  return (
    <div className="mb-4 w-1/2 text-center ">
      <div
        id="progress-container"
        className="w-full h-40 bg-gray-700 rounded-lg overflow-hidden mb-4 relative"
      >
        {progressVisible ? (
          <div
            id="progress-bar"
            className="h-full bg-gradient-to-r from-red-400 to-blue-500 transition-all duration-500 flex items-center justify-center text-white font-bold"
            style={{ width: `${progress}%` }}
          >
            <div className="font-mono font-bold absolute inset-0 flex items-center justify-center text-6xl">
              {timer}
            </div>
          </div>
        ) : (
          <div className="font-mono font-bold absolute justify-center items-center flex inset-0 text-8xl">
            Your turn
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBarComponent;
