import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBucket() {
    const { data, error } = await supabase.storage.getBucket('reports');
    console.log('Bucket get:', { data, error });

    if (data) {
        console.log('Bucket is public:', data.public);
    }
}

checkBucket();
