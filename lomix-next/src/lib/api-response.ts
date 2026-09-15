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

  static error(message: string = "Bir hata oluştu", status: number = 400, data?: any) {
    const body: Record<string, any> = {
      status: false,
      success: false,
      message
    };

    // Bazi uclar (orn. profile/follow) hata durumunda da govde bekliyor.
    if (data !== undefined) {
      body.data = data;
    }

    return NextResponse.json(body, { status });
  }
}
