import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useState } from "react";
import MachinesManager from "../components/admin/MachinesManager";
import OperatorsManager from "../components/admin/OperatorsManager";
import ProductsManager from "../components/admin/ProductsManager";
import ReportsViewer from "../components/admin/ReportsViewer";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage master data and view production reports
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6 bg-secondary">
          <TabsTrigger
            value="products"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Products
          </TabsTrigger>
          <TabsTrigger
            value="machines"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Machines
          </TabsTrigger>
          <TabsTrigger
            value="operators"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Operators
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductsManager />
        </TabsContent>
        <TabsContent value="machines">
          <MachinesManager />
        </TabsContent>
        <TabsContent value="operators">
          <OperatorsManager />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
