declare module "react-signature-canvas" {
  import * as React from "react";

  export interface SignatureCanvasProps {
    penColor?: string;
    clearOnResize?: boolean;
    onBegin?: () => void;
    onEnd?: () => void;
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
  }

  export default class SignatureCanvas extends React.Component<SignatureCanvasProps> {
    clear(): void;
    isEmpty(): boolean;
    toDataURL(type?: string, encoderOptions?: number): string;
    fromDataURL(dataUrl: string): void;
    getTrimmedCanvas(): HTMLCanvasElement;
  }
}
