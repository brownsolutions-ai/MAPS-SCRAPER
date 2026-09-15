import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
await build({stdin:{contents:"export {createClient} from '@supabase/supabase-js';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',minify:true,outfile:'dist/vendor/supabase.js'});
await copyFile('supabase/schema.sql','dist/schema.sql');
console.log('CRM pronto em dist/');
