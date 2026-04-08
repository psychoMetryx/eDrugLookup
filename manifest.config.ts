import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'eDrugLookup',
  version: '0.1.0',
  description: 'Drug lookup helper for e-Clinic resep non racik workflows.',
  host_permissions: ['https://emr.eclinic.id/*'],
  content_scripts: [
    {
      matches: ['https://emr.eclinic.id/pemeriksaanmedis/show/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      world: 'MAIN'
    },
    {
      matches: ['https://emr.eclinic.id/pemeriksaanmedis/show/*'],
      js: ['src/content/helpLauncherEntry.ts'],
      run_at: 'document_idle'
    }
  ]
});
