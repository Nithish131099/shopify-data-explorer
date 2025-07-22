import { useState } from 'react';
import { ArrowLeft, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StoreManager from '@/components/StoreManager';
import DataViewer from '@/components/DataViewer';

interface Store {
  id: number;
  store_name: string;
  shopify_domain: string;
  created_at: string;
}

const Index = () => {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-primary-glow">
                <Database className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Shopify Data Explorer</h1>
                <p className="text-sm text-muted-foreground">Multi-store analytics dashboard</p>
              </div>
            </div>
            
            {selectedStore && (
              <Button 
                variant="outline" 
                onClick={() => setSelectedStore(null)}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Stores</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedStore ? (
          <DataViewer store={selectedStore} />
        ) : (
          <StoreManager 
            onStoreSelect={setSelectedStore}
            selectedStore={selectedStore}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Secure multi-store Shopify data viewer with real-time analytics</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
