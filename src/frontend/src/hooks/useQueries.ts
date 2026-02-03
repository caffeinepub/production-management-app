import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { 
  Product, 
  Machine, 
  Operator, 
  ProductId,
  MachineId,
  OperatorId,
  ProductionEntry,
  EntryId,
} from '../backend';
import { toast } from 'sonner';
import { normalizeBackendError } from '../utils/backendError';

// Helper hook to check if user is authenticated
export function useIsAuthenticated() {
  const { identity } = useInternetIdentity();
  return !!identity && !identity.getPrincipal().isAnonymous();
}

// Master Data Queries with Sorting
export function useGetAllProducts(sortBy: 'id' | 'name' | 'loadingTime' | 'unloadingTime' | 'piecesPerCycle' = 'id') {
  const { actor, isFetching } = useActor();

  return useQuery<Product[]>({
    queryKey: ['products', sortBy],
    queryFn: async () => {
      if (!actor) return [];
      switch (sortBy) {
        case 'id':
          return actor.getAllProducts();
        case 'name':
          return actor.getAllProductsSortedByName();
        case 'loadingTime':
          return actor.getAllProductsSortedByLoadingTime();
        case 'unloadingTime':
          return actor.getAllProductsSortedByUnloadingTime();
        case 'piecesPerCycle':
          return actor.getAllProductsSortedByPiecesPerCycle();
        default:
          return actor.getAllProducts();
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000,
  });
}

export function useGetAllMachines(sortBy: 'id' | 'name' = 'id') {
  const { actor, isFetching } = useActor();

  return useQuery<Machine[]>({
    queryKey: ['machines', sortBy],
    queryFn: async () => {
      if (!actor) return [];
      if (sortBy === 'name') {
        return actor.getAllMachinesSortedByName();
      }
      return actor.getAllMachines();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000,
  });
}

export function useGetAllOperators(sortBy: 'id' | 'name' = 'id') {
  const { actor, isFetching } = useActor();

  return useQuery<Operator[]>({
    queryKey: ['operators', sortBy],
    queryFn: async () => {
      if (!actor) return [];
      if (sortBy === 'name') {
        return actor.getAllOperatorsSortedByName();
      }
      return actor.getAllOperators();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000,
  });
}

// Product Mutations
export function useAddProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  return useMutation({
    mutationFn: async (data: { name: string; loadingTime: number; unloadingTime: number; piecesPerCycle: number; cycleTime: number }) => {
      if (!actor) throw new Error('Actor not available');
      if (!isAuthenticated) throw new Error('Unauthorized: Only authenticated users can create products');
      
      const existingProducts = queryClient.getQueryData<Product[]>(['products', 'id']) || 
                               queryClient.getQueryData<Product[]>(['products', 'name']) || [];
      
      if (existingProducts.some(p => p.name.toLowerCase() === data.name.toLowerCase())) {
        throw new Error('A product with this name already exists');
      }
      
      return actor.createProduct(data.name, BigInt(data.loadingTime), BigInt(data.unloadingTime), BigInt(data.piecesPerCycle), BigInt(data.cycleTime));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['products'],
        refetchType: 'active'
      });
      toast.success('Product added successfully');
    },
    onError: (error: Error) => {
      const message = normalizeBackendError(error);
      toast.error(message);
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  return useMutation({
    mutationFn: async (data: { id: ProductId; name: string; loadingTime: number; unloadingTime: number; piecesPerCycle: number; cycleTime: number }) => {
      if (!actor) throw new Error('Actor not available');
      if (!isAuthenticated) throw new Error('Unauthorized: Only authenticated users can update products');
      
      const existingProducts = queryClient.getQueryData<Product[]>(['products', 'id']) || 
                               queryClient.getQueryData<Product[]>(['products', 'name']) || [];
      
      if (existingProducts.some(p => p.id !== data.id && p.name.toLowerCase() === data.name.toLowerCase())) {
        throw new Error('A product with this name already exists');
      }
      
      return actor.updateProduct(data.id, data.name, BigInt(data.loadingTime), BigInt(data.unloadingTime), BigInt(data.piecesPerCycle), BigInt(data.cycleTime));
    },
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });

      const previousProducts = new Map();
      queryClient.getQueriesData<Product[]>({ queryKey: ['products'] }).forEach(([key, data]) => {
        if (data) previousProducts.set(JSON.stringify(key), data);
      });

      queryClient.setQueriesData<Product[]>({ queryKey: ['products'] }, (old) => {
        if (!old) return old;
        return old.map(p => 
          p.id === newProduct.id 
            ? { ...p, name: newProduct.name, loadingTime: BigInt(newProduct.loadingTime), unloadingTime: BigInt(newProduct.unloadingTime), piecesPerCycle: BigInt(newProduct.piecesPerCycle), cycleTime: BigInt(newProduct.cycleTime) }
            : p
        );
      });

      return { previousProducts };
    },
    onError: (error: Error, _newProduct, context) => {
      if (context?.previousProducts) {
        context.previousProducts.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
      const message = normalizeBackendError(error);
      toast.error(message);
    },
    onSuccess: () => {
      toast.success('Product updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['products'],
        refetchType: 'active'
      });
    },
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  return useMutation({
    mutationFn: async (id: ProductId) => {
      if (!actor) throw new Error('Actor not available');
      if (!isAuthenticated) throw new Error('Unauthorized: Only authenticated users can delete products');
      return actor.deleteProduct(id);
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });

      const previousProducts = new Map();
      queryClient.getQueriesData<Product[]>({ queryKey: ['products'] }).forEach(([key, data]) => {
        if (data) previousProducts.set(JSON.stringify(key), data);
      });

      queryClient.setQueriesData<Product[]>({ queryKey: ['products'] }, (old) => {
        if (!old) return old;
        return old.filter(p => p.id !== deletedId);
      });

      return { previousProducts };
    },
    onError: (error: Error, _deletedId, context) => {
      if (context?.previousProducts) {
        context.previousProducts.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
      const message = normalizeBackendError(error);
      toast.error(message);
    },
    onSuccess: () => {
      toast.success('Product deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['products'],
        refetchType: 'active'
      });
    },
  });
}

// Machine Mutations
export function useAddMachine() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      if (!isAuthenticated) throw new Error('Unauthorized: Only authenticated users can create machines');
      
      const existingMachines = queryClient.getQueryData<Machine[]>(['machines', 'id']) || 
                               queryClient.getQueryData<Machine[]>(['machines', 'name']) || [];
      
      if (existingMachines.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('A machine with this name already exists');
      }
      
      return actor.createMachine(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['machines'],
        refetchType: 'active'
      });
      toast.success('Machine added successfully');
    },
    onError: (error: Error) => {
      const message = normalizeBackendError(error);
      toast.error(message);
    },
  });
}

export function useUpdateMachine() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  return useMutation({
    mutationFn: async (data: { id: MachineId; name: string }) => {
      if (!actor) throw new Error('Actor not available');
      if (!isAuthenticated) throw new Error('Unauthorized: Only authenticated users can update machines');
      
      const existingMachines = queryClient.getQueryData<Machine[]>(['machines', 'id']) || 
                               queryClient.getQueryData<Machine[]>(['machines', 'name']) || [];
      
      if (existingMachines.some(m => m.id !== data.id && m.name.toLowerCase() === data.name.toLowerCase())) {
        throw new Error('A machine with this name already exists');
      }
      
      return actor.updateMachine(data.id, data.name);
    },
    onMutate: async (newMachine) => {
      await queryClient.cancelQueries({ queryKey: ['machines'] });

      const previousMachines = new Map();
      queryClient.getQueriesData<Machine[]>({ queryKey: ['machines'] }).forEach(([key, data]) => {
        if (data) previousMachines.set(JSON.stringify(key), data);
      });

      queryClient.setQueriesData<Machine[]>({ queryKey: ['machines'] }, (old) => {
        if (!old) return old;
        return old.map(m => m.id === newMachine.id ? { ...m, name: newMachine.name } : m);
      });

      return { previousMachines };
    },
    onError: (error: Error, _newMachine, context) => {
      if (context?.previousMachines) {
        context.previousMachines.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
      const message = normalizeBackendError(error);
      toast.error(message);
    },
    onSuccess: () => {
      toast.success('Machine updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['machines'],
        refetchType: 'active'
      });
    },
  });
}

export function useDeleteMachine() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  return useMutation({
    mutationFn: async (id: MachineId) => {
      if (!actor) throw new Error('Actor not available');
      if (!isAuthenticated) throw new Error('Unauthorized: Only authenticated users can delete machines');
      return actor.deleteMachine(id);
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['machines'] });

      const previousMachines = new Map();
      queryClient.getQueriesData<Machine[]>({ queryKey: ['machines'] }).forEach(([key, data]) => {
        if (data) previousMachines.set(JSON.stringify(key), data);
      });

      queryClient.setQueriesData<Machine[]>({ queryKey: ['machines'] }, (old) => {
        if (!old) return old;
        return old.filter(m => m.id !== deletedId);
      });

      return { previousMachines };
    },
    onError: (error: Error, _deletedId, context) => {
      if (context?.previousMachines) {
        context.previousMachines.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
      const message = normalizeBackendError(error);
      toast.error(message);
    },
    onSuccess: () => {
      toast.success('Machine deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['machines'],
        refetchType: 'active'
      });
    },
  });
}

// Operator Mutations
export function useAddOperator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      if (!isAuthenticated) throw new Error('Unauthorized: Only authenticated users can create operators');
      
      const existingOperators = queryClient.getQueryData<Operator[]>(['operators', 'id']) || 
                                queryClient.getQueryData<Operator[]>(['operators', 'name']) || [];
      
      if (existingOperators.some(o => o.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('An operator with this name already exists');
      }
      
      return actor.createOperator(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['operators'],
        refetchType: 'active'
      });
      toast.success('Operator added successfully');
    },
    onError: (error: Error) => {
      const message = normalizeBackendError(error);
      toast.error(message);
    },
  });
}

export function useUpdateOperator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  return useMutation({
    mutationFn: async (data: { id: OperatorId; name: string }) => {
      if (!actor) throw new Error('Actor not available');
      if (!isAuthenticated) throw new Error('Unauthorized: Only authenticated users can update operators');
      
      const existingOperators = queryClient.getQueryData<Operator[]>(['operators', 'id']) || 
                                queryClient.getQueryData<Operator[]>(['operators', 'name']) || [];
      
      if (existingOperators.some(o => o.id !== data.id && o.name.toLowerCase() === data.name.toLowerCase())) {
        throw new Error('An operator with this name already exists');
      }
      
      return actor.updateOperator(data.id, data.name);
    },
    onMutate: async (newOperator) => {
      await queryClient.cancelQueries({ queryKey: ['operators'] });

      const previousOperators = new Map();
      queryClient.getQueriesData<Operator[]>({ queryKey: ['operators'] }).forEach(([key, data]) => {
        if (data) previousOperators.set(JSON.stringify(key), data);
      });

      queryClient.setQueriesData<Operator[]>({ queryKey: ['operators'] }, (old) => {
        if (!old) return old;
        return old.map(o => o.id === newOperator.id ? { ...o, name: newOperator.name } : o);
      });

      return { previousOperators };
    },
    onError: (error: Error, _newOperator, context) => {
      if (context?.previousOperators) {
        context.previousOperators.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
      const message = normalizeBackendError(error);
      toast.error(message);
    },
    onSuccess: () => {
      toast.success('Operator updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['operators'],
        refetchType: 'active'
      });
    },
  });
}

export function useDeleteOperator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  return useMutation({
    mutationFn: async (id: OperatorId) => {
      if (!actor) throw new Error('Actor not available');
      if (!isAuthenticated) throw new Error('Unauthorized: Only authenticated users can delete operators');
      return actor.deleteOperator(id);
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['operators'] });

      const previousOperators = new Map();
      queryClient.getQueriesData<Operator[]>({ queryKey: ['operators'] }).forEach(([key, data]) => {
        if (data) previousOperators.set(JSON.stringify(key), data);
      });

      queryClient.setQueriesData<Operator[]>({ queryKey: ['operators'] }, (old) => {
        if (!old) return old;
        return old.filter(o => o.id !== deletedId);
      });

      return { previousOperators };
    },
    onError: (error: Error, _deletedId, context) => {
      if (context?.previousOperators) {
        context.previousOperators.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
      const message = normalizeBackendError(error);
      toast.error(message);
    },
    onSuccess: () => {
      toast.success('Operator deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['operators'],
        refetchType: 'active'
      });
    },
  });
}

// Production Entry Mutations
export function useAddProductionEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      machineId: MachineId;
      operatorId: OperatorId;
      productId: ProductId;
      cycleTime: { minutes: bigint; seconds: bigint };
      quantityProduced: bigint;
      downtimeReason: string;
      downtimeTime: { minutes: bigint; seconds: bigint };
      punchIn: bigint;
      punchOut: bigint;
      timestamp?: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addProductionEntry(
        data.machineId,
        data.operatorId,
        data.productId,
        data.cycleTime,
        data.quantityProduced,
        data.downtimeReason,
        data.downtimeTime,
        data.punchIn,
        data.punchOut,
        data.timestamp ?? null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['entries'],
        refetchType: 'active'
      });
      toast.success('Production entry saved successfully');
    },
    onError: (error: Error) => {
      const message = normalizeBackendError(error);
      toast.error(message);
    },
  });
}

// Production Entry Queries with optional enablement control
export function useGetAllProductionEntries(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();
  const enabled = options?.enabled !== undefined ? options.enabled : true;

  return useQuery<ProductionEntry[]>({
    queryKey: ['entries', 'all'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProductionEntries();
    },
    enabled: !!actor && !isFetching && enabled,
    staleTime: 10000,
  });
}

export function useGetProductionEntriesByDateRange(startDate: Date | null, endDate: Date | null, options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();
  const hasValidDates = !!startDate && !!endDate;
  const enabled = options?.enabled !== undefined ? options.enabled : true;

  return useQuery<ProductionEntry[]>({
    queryKey: ['entries', 'dateRange', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!actor || !startDate || !endDate) return [];
      const startNs = BigInt(startDate.getTime()) * BigInt(1_000_000);
      const endNs = BigInt(endDate.getTime()) * BigInt(1_000_000);
      return actor.getProductionEntriesByDateRange(startNs, endNs);
    },
    enabled: !!actor && !isFetching && hasValidDates && enabled,
    staleTime: 10000,
  });
}

export function useGetProductionEntriesByOperator(operatorId: OperatorId | null, options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();
  const enabled = options?.enabled !== undefined ? options.enabled : true;

  return useQuery<ProductionEntry[]>({
    queryKey: ['entries', 'operator', operatorId?.toString()],
    queryFn: async () => {
      if (!actor || !operatorId) return [];
      return actor.getProductionEntriesByOperator(operatorId);
    },
    enabled: !!actor && !isFetching && !!operatorId && enabled,
    staleTime: 10000,
  });
}

export function useGetProductionEntriesByProduct(productId: ProductId | null, options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();
  const enabled = options?.enabled !== undefined ? options.enabled : true;

  return useQuery<ProductionEntry[]>({
    queryKey: ['entries', 'product', productId?.toString()],
    queryFn: async () => {
      if (!actor || !productId) return [];
      return actor.getProductionEntriesByProduct(productId);
    },
    enabled: !!actor && !isFetching && !!productId && enabled,
    staleTime: 10000,
  });
}

export function useDeleteProductionEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: EntryId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteProductionEntry(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['entries'],
        refetchType: 'active'
      });
      toast.success('Production entry deleted successfully');
    },
    onError: (error: Error) => {
      const message = normalizeBackendError(error);
      toast.error(message);
    },
  });
}
