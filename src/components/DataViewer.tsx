import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, Package, Users, AlertCircle } from 'lucide-react';
import DataTable from './DataTable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Store {
  id: number;
  store_name: string;
  shopify_domain: string;
}

interface DataViewerProps {
  store: Store;
}

type DataType = 'orders' | 'products' | 'customers';

interface ShopifyNode {
  id: string;
  [key: string]: any;
}

interface ShopifyResponse {
  data: {
    [key: string]: {
      edges: Array<{
        node: ShopifyNode;
      }>;
    };
  };
  errors?: any[];
}

export default function DataViewer({ store }: DataViewerProps) {
  const [activeTab, setActiveTab] = useState<DataType>('orders');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ShopifyNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (store) {
      fetchData(activeTab);
    }
  }, [store, activeTab]);

  const fetchData = async (dataType: DataType) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: responseData, error: functionError } = await supabase.functions.invoke(
        'fetch-shopify-data',
        {
          body: {
            store_id: store.id,
            data_type: dataType
          }
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      const shopifyResponse = responseData as ShopifyResponse;
      
      if (shopifyResponse.errors) {
        throw new Error(`Shopify API Error: ${JSON.stringify(shopifyResponse.errors)}`);
      }

      // Extract the nodes from the response
      const dataKey = dataType;
      const edges = shopifyResponse.data?.[dataKey]?.edges || [];
      const nodes = edges.map(edge => edge.node);
      
      setData(nodes);
      
      if (nodes.length === 0) {
        toast({
          title: 'No data found',
          description: `No ${dataType} found for this store.`
        });
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to fetch data');
      toast({
        title: 'Error',
        description: `Failed to fetch ${dataType}: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getColumns = (dataType: DataType) => {
    switch (dataType) {
      case 'orders':
        return [
          { key: 'name', label: 'Order' },
          { key: 'displayFinancialStatus', label: 'Payment Status' },
          { key: 'displayFulfillmentStatus', label: 'Fulfillment Status' },
          { key: 'totalPrice', label: 'Total' },
          { key: 'customerName', label: 'Customer' },
          { key: 'processedAt', label: 'Date' }
        ];
      case 'products':
        return [
          { key: 'title', label: 'Product' },
          { key: 'status', label: 'Status' },
          { key: 'totalInventory', label: 'Inventory' },
          { key: 'price', label: 'Price' },
          { key: 'updatedAt', label: 'Updated' }
        ];
      case 'customers':
        return [
          { key: 'displayName', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'numberOfOrders', label: 'Orders' },
          { key: 'amountSpent', label: 'Total Spent' }
        ];
      default:
        return [];
    }
  };

  const processData = (nodes: ShopifyNode[], dataType: DataType) => {
    return nodes.map(node => {
      switch (dataType) {
        case 'orders':
          return {
            ...node,
            totalPrice: node.totalPriceSet?.shopMoney 
              ? `${node.totalPriceSet.shopMoney.currencyCode} ${parseFloat(node.totalPriceSet.shopMoney.amount).toFixed(2)}`
              : 'N/A',
            customerName: node.customer 
              ? `${node.customer.firstName || ''} ${node.customer.lastName || ''}`.trim() || node.customer.email || 'Guest'
              : 'Guest',
            processedAt: node.processedAt ? new Date(node.processedAt).toLocaleDateString() : 'N/A'
          };
        case 'products':
          return {
            ...node,
            price: node.priceRangeV2?.minVariantPrice 
              ? `${node.priceRangeV2.minVariantPrice.currencyCode} ${parseFloat(node.priceRangeV2.minVariantPrice.amount).toFixed(2)}`
              : 'N/A',
            updatedAt: node.updatedAt ? new Date(node.updatedAt).toLocaleDateString() : 'N/A'
          };
        case 'customers':
          return {
            ...node,
            amountSpent: node.amountSpent 
              ? `${node.amountSpent.currencyCode} ${parseFloat(node.amountSpent.amount).toFixed(2)}`
              : 'N/A'
          };
        default:
          return node;
      }
    });
  };

  const getTabIcon = (dataType: DataType) => {
    switch (dataType) {
      case 'orders':
        return <ShoppingCart className="h-4 w-4" />;
      case 'products':
        return <Package className="h-4 w-4" />;
      case 'customers':
        return <Users className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading {activeTab}...</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Data</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <button 
                onClick={() => fetchData(activeTab)}
                className="text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (data.length === 0) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              {getTabIcon(activeTab)}
              <h3 className="text-lg font-semibold mb-2 mt-4">No {activeTab} found</h3>
              <p className="text-muted-foreground">
                This store doesn't have any {activeTab} yet.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <DataTable 
        columns={getColumns(activeTab)}
        data={processData(data, activeTab)}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{store.store_name}</h2>
          <p className="text-muted-foreground">{store.shopify_domain}</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">
          Connected
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DataType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders" className="flex items-center space-x-2">
            <ShoppingCart className="h-4 w-4" />
            <span>Orders</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Products</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Customers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                Last 20 orders from your store
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderContent()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>
                Last 20 updated products in your store
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderContent()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>
                Last 20 updated customers
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderContent()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}