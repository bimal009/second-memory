import type { CameraView } from "expo-camera";

/** Native camera view lifecycle, separate from React render state. */
export class CameraBinding {
  private camera: CameraView | null = null;
  private ready = false;
  private pending: { resolve: () => void; reject: (error: Error) => void } | null = null;
  constructor(private show: (mounted: boolean) => void) {}
  attach = (camera: CameraView | null) => { this.camera = camera; };
  get = () => this.camera;
  onReady = () => { this.ready = true; this.pending?.resolve(); this.pending = null; };
  onError = (error: { message: string }) => { this.pending?.reject(new Error(error.message)); this.pending = null; };
  mount = () => {
    if (this.ready && this.camera) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { this.pending = null; reject(new Error("The camera did not become ready. Please retry.")); }, 10000);
      this.pending = { resolve: () => { clearTimeout(timer); resolve(); }, reject: error => { clearTimeout(timer); reject(error); } };
      this.show(true);
    });
  };
  release = async () => {
    if (!this.camera && !this.pending) { this.show(false); return; }
    this.ready = false;
    this.pending?.reject(new Error("Camera closed.")); this.pending = null;
    this.show(false);
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => { setTimeout(resolve, 150); })));
    this.camera = null;
  };
}
