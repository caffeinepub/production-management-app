import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Cog, Users, FileText } from 'lucide-react';
import ProductsManager from '../components/admin/ProductsManager';
import MachinesManager from '../components/admin/MachinesManager';
import OperatorsManager from '../components/admin/OperatorsManager';
import ReportsViewer from '../components/admin/ReportsViewer';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Master Data & Reports</h2>
        <p className="text-muted-foreground">
          Manage products, machines, operators, and view production reports
        </p>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Products</span>
          </TabsTrigger>
          <TabsTrigger value="machines" className="flex items-center gap-2">
            <Cog className="h-4 w-4" />
            <span className="hidden sm:inline">Machines</span>
          </TabsTrigger>
          <TabsTrigger value="operators" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Operators</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <ProductsManager />
        </TabsContent>

        <TabsContent value="machines" className="mt-6">
          <MachinesManager />
        </TabsContent>

        <TabsContent value="operators" className="mt-6">
          <OperatorsManager />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportsViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
