import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the structure of the incoming request body for type safety.
interface RequestBody {
  store_id: number;
  data_type: 'orders' | 'products' | 'customers';
}

// GraphQL queries - removed restricted customer fields to avoid access issues
const QUERIES = {
  orders: `
    query getOrders {
      orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            name
            processedAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet { shopMoney { amount currencyCode } }
          }
        }
      }
    }
  `,
  products: `
    query getProducts {
      products(first: 20, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
            status
            totalInventory
            updatedAt
            featuredImage { url }
            priceRangeV2 { minVariantPrice { amount currencyCode } }
          }
        }
      }
    }
  `,
  customers: `
    query getCustomers {
      customers(first: 20, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            numberOfOrders
            amountSpent { amount currencyCode }
          }
        }
      }
    }
  `,
};

Deno.serve(async (req) => {
  // Immediately handle OPTIONS requests for CORS preflight.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. --- Validate and Parse Incoming Request ---
    const { store_id, data_type }: RequestBody = await req.json();
    if (!store_id || !data_type) {
      throw new Error('Missing required fields: store_id and data_type.');
    }
    if (!QUERIES[data_type]) {
      throw new Error(`Invalid data_type specified: ${data_type}`);
    }

    // 2. --- Initialize Supabase Admin Client ---
    // Use the admin client for server-side operations to bypass RLS.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. --- Fetch Store Credentials from Database ---
    console.log(`Fetching store details for ID: ${store_id}`);
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('shopify_domain, api_access_token')
      .eq('id', store_id)
      .single(); // .single() is important, it returns one object or null

    if (storeError || !store) {
      console.error('Error fetching store from DB:', storeError);
      return new Response(
        JSON.stringify({ error: `Store with ID ${store_id} not found.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { shopify_domain, api_access_token } = store;

    // 4. --- Make Request to Shopify GraphQL API ---
    const shopifyApiUrl = `https://${shopify_domain}/admin/api/2024-07/graphql.json`;
    const query = QUERIES[data_type];

    console.log(`Making request to Shopify for ${data_type}...`);
    const shopifyResponse = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': api_access_token,
      },
      body: JSON.stringify({ query }),
    });

    // 5. --- Handle Shopify's Response ---
    if (!shopifyResponse.ok) {
      // If Shopify returns an error, log it and forward it to the client.
      const errorBody = await shopifyResponse.text();
      console.error(`Shopify API error for ${shopify_domain}:`, {
        status: shopifyResponse.status,
        body: errorBody,
      });
      throw new Error(`Shopify API failed with status ${shopifyResponse.status}: ${errorBody}`);
    }

    const responseData = await shopifyResponse.json();
    
    // Check for errors within the GraphQL response body itself
    if (responseData.errors) {
        console.error('Shopify GraphQL errors:', responseData.errors);
        throw new Error(`GraphQL error: ${JSON.stringify(responseData.errors)}`);
    }

    // 6. --- Return Successful Data to Client ---
    return new Response(JSON.stringify(responseData.data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Generic catch-all for any other errors.
    console.error('An unexpected error occurred:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});