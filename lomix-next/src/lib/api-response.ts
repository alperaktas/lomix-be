import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: any;
}

export class ApiResponseHelper {
  static success<T>(data: T, message: string = "İşlem başarılı", status: number = 200, meta?: any) {
    const response: ApiResponse<T> = {
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
      success: false,
      message
    }, { status });
  }
}
