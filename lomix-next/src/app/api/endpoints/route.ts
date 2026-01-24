import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const endpoints = await prisma.endpoint.findMany({
            orderBy: { category: 'asc' }
        });
        return NextResponse.json(endpoints);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { category, method, path, description, requestSample, responseSample } = body;

        const endpoint = await prisma.endpoint.create({
            data: {
                category,
                method,
                path,
                description,
                requestSample,
                responseSample
            }
        });

        return NextResponse.json(endpoint, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
