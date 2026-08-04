<script setup lang="ts">
/**
 * Customers — a THIN page. The list, its filters and its query all live in the feature
 * component. The remaining sub-views from the spec (profile, segments, journey timeline)
 * land in the Customers module slice; this route exists now because the list is what
 * proves the shared DataTable against a real endpoint.
 */
const { t } = useI18n()
</script>

<template>
  <div>
    <CommonPageHeader :title="t('customers.title')" :subtitle="t('customers.subtitle')" />
    <CustomersCustomerList />
  </div>
</template>
