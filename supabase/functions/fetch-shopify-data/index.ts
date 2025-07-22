import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// GraphQL queries for different data types
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
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customer {
              firstName
              lastName
              email
            }
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
            featuredImage {
              url
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
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
            displayName
            email
            numberOfOrders
            amountSpent {
              amount
              currencyCode
            }
          }
        }
      }
    }
  `
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { store_id, data_type } = await req.json();

    if (!store_id || !data_type) {
      console.error('Missing required parameters:', { store_id, data_type });
      return new Response(
        JSON.stringify({ error: 'Missing store_id or data_type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!QUERIES[data_type as keyof typeof QUERIES]) {
      console.error('Invalid data_type:', data_type);
      return new Response(
        JSON.stringify({ error: 'Invalid data_type. Must be: orders, products, or customers' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get store details from database
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('shopify_domain, api_access_token')
      .eq('id', store_id)
      .single();

    if (storeError || !store) {
      console.error('Store not found:', storeError);
      return new Response(
        JSON.stringify({ error: 'Store not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Construct Shopify GraphQL endpoint
    const shopifyUrl = `https://${store.shopify_domain}/admin/api/2024-07/graphql.json`;
    
    console.log('Fetching data from Shopify:', { shopifyUrl, data_type });

    // Make GraphQL request to Shopify
    const shopifyResponse = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.api_access_token,
      },
      body: JSON.stringify({
        query: QUERIES[data_type as keyof typeof QUERIES],
      }),
    });

    if (!shopifyResponse.ok) {
      console.error('Shopify API error:', shopifyResponse.status, shopifyResponse.statusText);
      const errorText = await shopifyResponse.text();
      console.error('Error details:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Shopify API request failed',
          details: `${shopifyResponse.status}: ${shopifyResponse.statusText}`,
          shopifyError: errorText
        }),
        { 
          status: shopifyResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const shopifyData = await shopifyResponse.json();
    
    if (shopifyData.errors) {
      console.error('Shopify GraphQL errors:', shopifyData.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Shopify GraphQL errors',
          details: shopifyData.errors
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully fetched data from Shopify');

    return new Response(
      JSON.stringify(shopifyData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});