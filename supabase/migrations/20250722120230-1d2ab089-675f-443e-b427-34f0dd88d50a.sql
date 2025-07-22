-- Create stores table for managing Shopify store connections
CREATE TABLE public.stores (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  store_name TEXT NOT NULL,
  shopify_domain TEXT NOT NULL UNIQUE,
  api_access_token TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (can be restricted later for multi-user)
CREATE POLICY "Allow all operations on stores" 
ON public.stores 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;