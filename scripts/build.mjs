import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
await build({stdin:{contents:"export {createClient} from '@supabase/supabase-js';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',minify:true,outfile:'dist/vendor/supabase.js'});
await writeFile('dist/schema.sql',(await readFile('supabase/schema.sql','utf8'))+'\n'+(await readFile('supabase/social-leads.sql','utf8')));
await copyFile('supabase/social-leads.sql','dist/social-leads.sql');
console.log('CRM pronto em dist/');
