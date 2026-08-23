import { Pose, Results, POSE_CONNECTIONS } from '@mediapipe/pose';

export interface PoseFramingAssessment {
  isFullBodyVisible: boolean;
  headVisible: boolean;
  shouldersVisible: boolean;
  hipsVisible: boolean;
  anklesVisible: boolean;
  postureStatusText: string;
  isSideProfileAligned: boolean;
  score: number;
}

export class LivePoseTracker {
  private pose: Pose | null = null;
  private isInitialized = false;

  constructor(onResults: (results: Results, assessment: PoseFramingAssessment) => void) {
    try {
      this.pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.pose.onResults((results) => {
        const assessment = this.assessFraming(results);
        onResults(results, assessment);
      });

      this.isInitialized = true;
    } catch (err) {
      console.warn('[MediaPipe Pose] Initialization fallback:', err);
    }
  }

  public async sendFrame(imageElement: HTMLVideoElement | HTMLCanvasElement): Promise<void> {
    if (this.pose && this.isInitialized) {
      try {
        await this.pose.send({ image: imageElement });
      } catch (e) {
        // Handle stream transition
      }
    }
  }

  public close(): void {
    if (this.pose) {
      try {
        this.pose.close();
      } catch (e) {
        // ignore
      }
      this.pose = null;
      this.isInitialized = false;
    }
  }

  private assessFraming(results: Results): PoseFramingAssessment {
    if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
      return {
        isFullBodyVisible: false,
        headVisible: false,
        shouldersVisible: false,
        hipsVisible: false,
        anklesVisible: false,
        postureStatusText: '⚠️ No human detected. Step into camera view.',
        isSideProfileAligned: false,
        score: 0,
      };
    }

    const lm = results.poseLandmarks;
    const nose = lm[0];
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    const leftHip = lm[23];
    const rightHip = lm[24];
    const leftAnkle = lm[27];
    const rightAnkle = lm[28];

    const isVisible = (p: any) => p && (p.visibility === undefined || p.visibility > 0.45);

    const headVisible = isVisible(nose) && nose.y > 0.02 && nose.y < 0.35;
    const shouldersVisible = isVisible(leftShoulder) && isVisible(rightShoulder);
    const hipsVisible = isVisible(leftHip) && isVisible(rightHip);
    const anklesVisible = (isVisible(leftAnkle) || isVisible(rightAnkle)) && (leftAnkle?.y < 0.98 || rightAnkle?.y < 0.98);

    // Calculate shoulder width vs hip depth to estimate orientation
    const shoulderSpan = Math.abs((leftShoulder?.x || 0) - (rightShoulder?.x || 0));
    const isSideProfileAligned = shoulderSpan < 0.12 && isVisible(leftShoulder);

    let postureStatusText = '🟢 Perfect Position! Hold steady.';
    let isFullBody = headVisible && shouldersVisible && hipsVisible && anklesVisible;

    if (!headVisible) {
      postureStatusText = '🟡 Adjust camera: Head cut off or too high';
    } else if (!anklesVisible) {
      postureStatusText = '🟡 Step back 2-3 meters: Feet/Ankles out of frame';
    } else if (!shouldersVisible) {
      postureStatusText = '🟡 Step into center: Shoulders not fully visible';
    }

    const score = [headVisible, shouldersVisible, hipsVisible, anklesVisible].filter(Boolean).length * 25;

    return {
      isFullBodyVisible: isFullBody,
      headVisible,
      shouldersVisible,
      hipsVisible,
      anklesVisible,
      postureStatusText,
      isSideProfileAligned,
      score,
    };
  }
}

/**
 * Draw Neon Glowing Skeleton Landmarks on HTML5 Viewfinder Canvas
 */
export function drawLiveSkeleton(
  ctx: CanvasRenderingContext2D,
  results: Results,
  width: number,
  height: number,
  isSidePose: boolean = false
) {
  if (!results.poseLandmarks || results.poseLandmarks.length === 0) return;

  const lm = results.poseLandmarks;
  ctx.save();

  // Glow styling
  ctx.lineWidth = 3;
  ctx.shadowBlur = 8;
  ctx.lineCap = 'round';

  const primaryColor = isSidePose ? '#f59e0b' : '#10b981'; // Amber for side, Emerald for front
  ctx.strokeStyle = primaryColor;
  ctx.shadowColor = primaryColor;

  // Draw Bones (Connections)
  if (POSE_CONNECTIONS) {
    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const p1 = lm[startIdx];
      const p2 = lm[endIdx];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.4 && (p2.visibility ?? 1) > 0.4) {
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    }
  }

  // Draw Key Landmark Joints
  const keyJointIndices = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  for (const idx of keyJointIndices) {
    const p = lm[idx];
    if (p && (p.visibility ?? 1) > 0.4) {
      const x = p.x * width;
      const y = p.y * height;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 7, 0, 2 * Math.PI);
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.restore();
}
