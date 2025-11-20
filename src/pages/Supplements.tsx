import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pill, Package, Search, History } from "lucide-react";
import { ActiveProtocol } from "@/components/supplements/ActiveProtocol";
import { TodaySchedule } from "@/components/supplements/TodaySchedule";
import { InventoryList } from "@/components/supplements/InventoryList";
import { ProductSearch } from "@/components/supplements/ProductSearch";
import { BarcodeScanner } from "@/components/supplements/BarcodeScanner";

export default function Supplements() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Supplement Management
        </h1>
        <p className="text-muted-foreground">
          Track your supplement protocols, inventory, and adherence
        </p>
      </div>

      <Tabs defaultValue="protocol" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="protocol" className="gap-2">
            <Pill className="h-4 w-4" />
            My Protocol
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Search & Scan
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="protocol" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ActiveProtocol />
            </div>
            <div>
              <TodaySchedule />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryList />
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ProductSearch />
            <BarcodeScanner />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="text-center py-12 text-muted-foreground">
            History tab - coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
