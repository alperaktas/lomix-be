import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  // Mobil istemci bazi endpointlerde `status`, bazilarinda `success` okuyor; ikisi de gonderiliyor.
  status: boolean;
  success: boolean;
  message: string;
  data?: T;
  meta?: any;
}

export class ApiResponseHelper {
  static success<T>(data: T, message: string = "İşlem başarılı", status: number = 200, meta?: any) {
    const response: ApiResponse<T> = {
      status: true,
      success: true,
      message,
      data
    };
    
    if (meta) {
      response.meta = meta;
    }

    return NextResponse.json(response, { status });
  }

  static error(message: string = "Bir hata oluştu", status: number = 400) {
    return NextResponse.json({
      status: false,
      success: false,
      message
    }, { status });
  }
}
