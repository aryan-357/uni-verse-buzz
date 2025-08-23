import React from 'react';
import Layout from '@/components/Layout';
import Feed from '@/components/Feed';

const Index = () => {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Home</h1>
        </header>
        <Feed />
      </div>
    </Layout>
  );
};

export default Index;
