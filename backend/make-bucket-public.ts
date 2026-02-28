import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateBucket() {
    const { data, error } = await supabase.storage.updateBucket('reports', {
        public: true,
    });
    console.log('Update result:', { data, error });
}

updateBucket();
