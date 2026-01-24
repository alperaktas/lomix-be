"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DynamicDashboardPage() {
    const params = useParams();
    // slug bir array döner: ['kategori', 'alt-kategori'] gibi
    const slugPath = Array.isArray(params.slug) ? params.slug.join('/') : params.slug;

    // İleride buraya veritabanından sayfa içeriğini çeken bir logic eklenebilir.
    // Şimdilik sadece sayfanın çalıştığını göstereceğiz.

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Dinamik Sayfa: {slugPath}</h3>
            </div>
            <div className="card-body">
                <div className="empty">
                    <div className="empty-img">
                        {/* Tabler 'construction' ikonu veya resmi */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler icon-tabler-cone" width="48" height="48" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 19l0 .01" /><path d="M19 17v1a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1v-1l7 -13l7 13z" /></svg>
                    </div>
                    <p className="empty-title">Bu sayfa dinamik olarak oluşturuldu</p>
                    <p className="empty-subtitle text-muted">
                        Yönetim panelinden eklediğiniz "{slugPath}" menüsü için henüz özel bir içerik tanımlanmadı.
                    </p>
                    <div className="empty-action">
                        {/* Buraya ileride CMS mantığı eklenebilir (Sayfa Düzenle butonu) */}
                        <button className="btn btn-primary">
                            Sayfa İçeriği Oluştur (Yakında)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
