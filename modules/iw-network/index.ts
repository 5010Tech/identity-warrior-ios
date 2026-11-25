import { requireOptionalNativeModule } from "expo-modules-core";

interface NativeRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  /** Text body, or bodyBase64 for bytes. */
  body?: string;
  bodyBase64?: string;
  /** Accept the certificate of this request's host as it is. */
  allowSelfSigned?: boolean;
  timeoutSeconds?: number;
}

interface NativeMail {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  to: string;
  fileName: string;
  attachmentBase64: string;
  /** Accept the mail server's certificate as it is. */
  allowSelfSigned?: boolean;
  timeoutSeconds?: number;
}

interface IwNetworkNative {
  request(options: NativeRequest): Promise<{ status: number; body: string }>;
  /** The system file browser; null if cancelled. Absent on an older build. */
  pickFile?(): Promise<{ name: string; base64: string } | null>;
  /** Absent on a build made before NRTIO submission was added. */
  sendMail?(options: NativeMail): Promise<{ sent: boolean }>;
}

/** Null until the app has been rebuilt with this module in it. */
const IwNetwork = requireOptionalNativeModule<IwNetworkNative>("IwNetwork");

export default IwNetwork;
export type { NativeMail, NativeRequest };
