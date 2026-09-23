export function dashboardError(error: unknown): { message: string; retryable: boolean; signIn: boolean } {
  const failure = error as { response?: { status?: number }; code?: string } | null;
  const status = failure?.response?.status;
  if (status === 400) return { message: 'ข้อมูลคำขอไม่ถูกต้อง กรุณาโหลดหน้าใหม่แล้วตรวจสอบข้อมูลก่อนลองอีกครั้ง', retryable: false, signIn: false };
  if (status === 401) return { message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', retryable: false, signIn: true };
  if (status === 403) return { message: 'บัญชีนี้ไม่มีสิทธิ์ดูหรือดำเนินการกับข้อมูลส่วนนี้ หากคิดว่าไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ', retryable: false, signIn: false };
  if (status === 404) return { message: 'ไม่พบข้อมูลที่ร้องขอ กรุณาลองโหลดข้อมูลอีกครั้ง', retryable: true, signIn: false };
  if (status === 429) return { message: 'มีการเรียกใช้งานบ่อยเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง', retryable: true, signIn: false };
  if (status && status >= 500) return { message: 'ระบบขัดข้องชั่วคราว กรุณารอสักครู่แล้วลองอีกครั้ง', retryable: true, signIn: false };
  if (failure?.code === 'ETIMEDOUT' || failure?.code === 'ECONNABORTED')
    return { message: 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง', retryable: true, signIn: false };
  return { message: 'ไม่สามารถเชื่อมต่อเพื่อรับข้อมูลได้ กรุณาตรวจสอบอินเทอร์เน็ตหรือลองอีกครั้ง', retryable: true, signIn: false };
}
