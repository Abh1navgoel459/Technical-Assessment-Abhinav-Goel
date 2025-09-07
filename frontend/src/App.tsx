import React, { useRef, useEffect, useState } from 'react';
import VideoPlayer from './components/VideoPlayer';
import { videoUrl } from './consts';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

export interface FaceDetection {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label?: string;
}

const speedOptions = [
  { name: 'Slow (0.5x)', value: 0.5 },
  { name: 'Normal', value: 1 },
  { name: 'Fast (2x)', value: 2 },
];

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showProcessed, setShowProcessed] = useState<boolean>(true);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState(1);

  const filters = [
    { name: 'Black & White', css: 'grayscale(100%)' },
    { name: 'More Blue', css: 'hue-rotate(200deg) saturate(3)' },
    { name: 'Blur', css: 'blur(4px)' },
    { name: 'None', css: 'none' },
  ];

  const [selectedFilter, setSelectedFilter] = useState(filters[0].css);

  useEffect(() => {
    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    selfieSegmentation.setOptions({
      modelSelection: 1,
    });

    selfieSegmentation.onResults((results) => {
      if (!canvasRef.current || !videoRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      const personCanvas = document.createElement('canvas');
      personCanvas.width = canvas.width;
      personCanvas.height = canvas.height;
      const personCtx = personCanvas.getContext('2d');
      if (!personCtx) return;
      personCtx.clearRect(0, 0, canvas.width, canvas.height);
      personCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      personCtx.globalCompositeOperation = 'destination-in';
      personCtx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.filter = selectedFilter;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      
      ctx.drawImage(personCanvas, 0, 0, canvas.width, canvas.height);
    });

    let animationFrameId: number;

    const processFrame = async () => {
      if (
        videoRef.current &&
        canvasRef.current &&
        !videoRef.current.paused &&
        !videoRef.current.ended
      ) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        await selfieSegmentation.send({ image: videoRef.current });
      }
      animationFrameId = requestAnimationFrame(processFrame);
    };

    if (videoRef.current) {
      videoRef.current.onplay = () => {
        processFrame();
      };
      videoRef.current.onpause = () => {
        cancelAnimationFrame(animationFrameId);
      };
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedFilter]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = selectedSpeed;
    }
  }, [selectedSpeed]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomVideoUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="theater-bg">
      <div style={{ textAlign: 'center' }}>
        <div className="theater-frame video-container" style={{ position: 'relative' }}>
          <VideoPlayer
            ref={videoRef}
            src={customVideoUrl || videoUrl}
            onLoadedMetadata={() => {
              if (canvasRef.current && videoRef.current) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
              }
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              display: showProcessed ? 'block' : 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              maxWidth: '800px',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />
        </div>
        <div className="controls">
          <select
            value={selectedFilter}
            onChange={e => setSelectedFilter(e.target.value)}
            className="btn"
            style={{ marginRight: '10px' }}
          >
            {filters.map(f => (
              <option key={f.name} value={f.css}>{f.name}</option>
            ))}
          </select>
          <select
            value={selectedSpeed}
            onChange={e => setSelectedSpeed(Number(e.target.value))}
            className="btn"
            style={{ marginRight: '10px' }}
          >
            {speedOptions.map(opt => (
              <option key={opt.name} value={opt.value}>{opt.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowProcessed((prev) => !prev)}
            className="btn btn-secondary"
          >
            {showProcessed ? 'Show Original' : 'Show Processed'}
          </button>
        </div>
        <input
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="btn"
          style={{ marginBottom: '10px' }}
        />
      </div>
    </div>
  );
};

export default App;