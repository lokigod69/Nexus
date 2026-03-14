import { NextRequest, NextResponse } from 'next/server';
import { getAllSignals, getSignalById } from '@/lib/db/queries';
import { signalToObsidianMd } from '@/lib/export/obsidian';
import { signalsToJson } from '@/lib/export/json';
import { signalsToMarkdown } from '@/lib/export/markdown';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const ids = searchParams.get('ids');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    // Load signals
    let signals;
    if (ids) {
      const idList = ids.split(',');
      const loaded = await Promise.all(idList.map(id => getSignalById(id)));
      signals = loaded.filter(Boolean);
    } else {
      const result = await getAllSignals({ category: category || undefined, status: status || undefined, limit: 10000 });
      signals = result.signals;
    }

    switch (format) {
      case 'obsidian': {
        const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
        const files = signals.map((s: any) => signalToObsidianMd(s));

        if (vaultPath) {
          // Write files directly to vault
          const nexusDir = path.join(vaultPath, 'Nexus');
          if (!fs.existsSync(nexusDir)) fs.mkdirSync(nexusDir, { recursive: true });
          for (const file of files) {
            fs.writeFileSync(path.join(nexusDir, file.filename), file.content, 'utf-8');
          }
          return NextResponse.json({ message: `Exported ${files.length} signals to ${nexusDir}`, count: files.length });
        }

        // Return as JSON with file contents
        return NextResponse.json({ files, count: files.length });
      }

      case 'markdown': {
        const md = signalsToMarkdown(signals);
        return new Response(md, {
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': 'attachment; filename="nexus-export.md"',
          },
        });
      }

      case 'json':
      default: {
        const json = signalsToJson(signals);
        return new Response(json, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="nexus-export.json"',
          },
        });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
