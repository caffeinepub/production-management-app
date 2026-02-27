import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { toast } from 'sonner';
import { normalizeBackendError } from '../utils/backendError';
import type { Product, Machine, Operator, ProductionEntry, UserProfile, NewProductFields, NewMachineFields, NewOperatorFields } from '../backend';

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully!');
    },
    onError: (error: any) => {
      toast.error(normalizeBackendError(error));
    },
  });
}

// ─── Products ────────────────────────────────────────────────────────────────

export function useGetAllProducts() {
  const { actor, isFetching } = useActor();

  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewProductFields) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
      toast.success('Product added successfully!');
    },
    onError: (error: any) => {
      toast.error(normalizeBackendError(error));
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: bigint; data: NewProductFields }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateProduct(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
      toast.success('Product updated successfully!');
    },
    onError: (error: any) => {
      toast.error(normalizeBackendError(error));
    },
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
      toast.success('Product deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(normalizeBackendError(error));
    },
  });
}

// ─── Machines ────────────────────────────────────────────────────────────────

export function useGetAllMachines() {
  const { actor, isFetching } = useActor();

  return useQuery<Machine[]>({
    queryKey: ['machines'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMachines();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddMachine() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fields: NewMachineFields) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addMachine(fields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'], refetchType: 'all' });
      toast.success('Machine added successfully!');
    },
    onError: (error: any) => {
      toast.error(normalizeBackendError(error));
    },
  });
}

export function useUpdateMachine() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: bigint; name: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateMachine(id, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'], refetchType: 'all' });
      toast.success('Machine updated successfully!');
    },
    onError: (error: any) => {
      toast.error(normalizeBackendError(error));
    },
  });
}

export function useDeleteMachine() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteMachine(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'], refetchType: 'all' });
      toast.success('Machine deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(normalizeBackendError(error));
    },
  });
}

// ─── Operators ───────────────────────────────────────────────────────────────

export function useGetAllOperators() {
  const { actor, isFetching } = useActor();

  return useQuery<Operator[]>({
    queryKey: ['operators'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllOperators();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddOperator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fields: NewOperatorFields) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addOperator(fields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'], refetchType: 'all' });
      toast.success('Operator added successfully!');
    },
    onError: (error: any) => {
      toast.error(normalizeBackendError(error));
    },
  });
}

export function useUpdateOperator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: bigint; name: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateOperator(id, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'], refetchType: 'all' });
      toast.success('Operator updated successfully!');
    },
    onError: (error: any) => {
      toast.error(normalizeBackendError(error));
    },
  });
}

export function useDeleteOperator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteOperator(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'], refetchType: 'all' });
      toast.success('Operator deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(normalizeBackendError(error));
    },
  });
}

// ─── Production Entries ──────────────────────────────────────────────────────

export function useGetSortedProductionEntries(sortBy: string = 'timestamp') {
  const { actor, isFetching } = useActor();

  return useQuery<ProductionEntry[]>({
    queryKey: ['productionEntries', sortBy],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSortedProductionEntries(sortBy);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddProductionEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      machineId: bigint;
      operatorId: bigint;
      productId: bigint;
      cycleTime: { minutes: bigint; seconds: bigint };
      quantityProduced: bigint;
      downtimeReason: string;
      downtimeTime: { minutes: bigint; seconds: bigint };
      punchIn: bigint;
      punchOut: bigint;
      timestamp?: bigint | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addProductionEntry(
        params.machineId,
        params.operatorId,
        params.productId,
        params.cycleTime,
        params.quantityProduced,
        params.downtimeReason,
        params.downtimeTime,
        params.punchIn,
        params.punchOut,
        params.timestamp ?? null,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionEntries'], refetchType: 'all' });
      toast.success('Production entry saved successfully!');
    },
    onError: (error: any) => {
      toast.error(normalizeBackendError(error));
    },
  });
}

export function useDeleteProductionEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteProductionEntry(entryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionEntries'], refetchType: 'all' });
      toast.success('Report deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(normalizeBackendError(error));
    },
  });
}
