import { useState, useEffect } from 'react';
import { Plus, Store, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Store {
  id: number;
  store_name: string;
  shopify_domain: string;
  created_at: string;
}

interface StoreManagerProps {
  onStoreSelect: (store: Store) => void;
  selectedStore: Store | null;
}

export default function StoreManager({ onStoreSelect, selectedStore }: StoreManagerProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    store_name: '',
    shopify_domain: '',
    api_access_token: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, store_name, shopify_domain, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch stores',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      // Ensure domain format is correct
      let domain = formData.shopify_domain;
      if (!domain.includes('.myshopify.com')) {
        domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!domain.endsWith('.myshopify.com')) {
          domain = `${domain}.myshopify.com`;
        }
      }

      const { error } = await supabase
        .from('stores')
        .insert([{
          store_name: formData.store_name,
          shopify_domain: domain,
          api_access_token: formData.api_access_token
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Store added successfully!'
      });

      setFormData({ store_name: '', shopify_domain: '', api_access_token: '' });
      setDialogOpen(false);
      fetchStores();
    } catch (error: any) {
      console.error('Error adding store:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add store',
        variant: 'destructive'
      });
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Your Shopify Stores</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-10 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Shopify Stores</h2>
          <p className="text-muted-foreground">
            Connect and manage your Shopify stores
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg transition-all">
              <Plus className="mr-2 h-4 w-4" />
              Add Store
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Shopify Store</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store_name">Store Name</Label>
                <Input
                  id="store_name"
                  placeholder="My T-Shirt Shop"
                  value={formData.store_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shopify_domain">Shopify Domain</Label>
                <Input
                  id="shopify_domain"
                  placeholder="your-store-name.myshopify.com"
                  value={formData.shopify_domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, shopify_domain: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api_access_token">Admin API Access Token</Label>
                <Input
                  id="api_access_token"
                  type="password"
                  placeholder="shpat_..."
                  value={formData.api_access_token}
                  onChange={(e) => setFormData(prev => ({ ...prev, api_access_token: e.target.value }))}
                  required
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={formLoading} className="flex-1">
                  {formLoading ? 'Adding...' : 'Add Store'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {stores.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Store className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No stores connected</h3>
            <p className="text-muted-foreground mb-4">
              Add your first Shopify store to get started
            </p>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-primary-glow"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Store
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Card 
              key={store.id} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedStore?.id === store.id 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : ''
              }`}
              onClick={() => onStoreSelect(store)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{store.store_name}</CardTitle>
                    <CardDescription className="text-sm">
                      {store.shopify_domain}
                    </CardDescription>
                  </div>
                  {selectedStore?.id === store.id && (
                    <Badge variant="default" className="bg-primary">
                      Selected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Added {new Date(store.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}