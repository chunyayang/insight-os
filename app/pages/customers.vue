<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <CommonPageHeader :title="t('customers.title')" :subtitle="t('customers.subtitle')" />
    <CustomersCustomerList />
  </div>
</template>
