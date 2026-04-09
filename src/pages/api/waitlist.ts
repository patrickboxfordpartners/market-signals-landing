import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!supabase) {
      console.error('Supabase not configured, email would have been:', email);
      return new Response(JSON.stringify({
        success: true,
        message: 'Thanks for signing up! We\'ll be in touch soon.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabase
      .from('waitlist')
      .insert([{
        email,
        source: 'landing_page',
        metadata: {
          referrer: request.headers.get('referer'),
          userAgent: request.headers.get('user-agent')
        }
      }]);

    if (error) {
      // Check if it's a duplicate email error
      if (error.code === '23505') {
        return new Response(JSON.stringify({
          success: true,
          message: 'You\'re already on the list!'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.error('Supabase error:', error);
      return new Response(JSON.stringify({ error: 'Failed to save email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Thanks for signing up! We\'ll be in touch soon.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Waitlist error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
