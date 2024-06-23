import React, { useEffect, useState } from "react";

interface ProgressBarComponentProps {
  timer: string;
  progress: number;
  progressVisible: boolean;
}

const ProgressBarComponent: React.FC<ProgressBarComponentProps> = ({
  timer,
  progress,
  progressVisible,
}) => {
  const [borderColor, setBorderColor] = useState("border-transparent");
  const [borderClass, setBorderClass] = useState("border-0");

  useEffect(() => {
    if (progress < 40) {
      setBorderClass("border-8");
      const blink = setInterval(() => {
        setBorderColor((prev) =>
          prev === "border-transparent"
            ? "border-red-500"
            : "border-transparent",
        );
      }, 250);
      return () => clearInterval(blink);
    } else if (progress < 70) {
      setBorderColor("border-yellow-500");
      setBorderClass("border-8");
    } else {
      setBorderColor("border-green-500");
      setBorderClass("border-8");
    }
  }, [progress]);

  useEffect(() => {
    if (!progressVisible) {
      setBorderClass("border-0");
    }
  }, [progressVisible]);

  return (
    <div className="mb-4 w-1/2 text-center">
      <div
        id="progress-container"
        className={`w-full h-40 bg-gray-700 rounded-lg overflow-hidden mb-4 relative border ${borderColor} ${borderClass} transition-all duration-500`}
      >
        {progressVisible ? (
          <div
            id="progress-bar"
            className={`h-full bg-gradient-to-r from-purple-500 to-gray-500 transition-all duration-500 flex items-center justify-center text-white font-bold`}
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
