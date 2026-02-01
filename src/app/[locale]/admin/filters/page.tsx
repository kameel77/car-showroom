'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFilters } from '@/hooks/useFilters';
import { Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';

export default function FilterAdminPage() {
  const t = useTranslations();
  const { 
    brands, 
    models, 
    loading, 
    error, 
    addBrand, 
    removeBrand, 
    toggleBrand, 
    addModel, 
    removeModel 
  } = useFilters();
  
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [expandedBrands, setExpandedBrands] = useState<Set<number>>(new Set());

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.trim()) return;
    
    try {
      await addBrand(newBrand.trim());
      setNewBrand('');
    } catch (err) {
      alert('Failed to add brand: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModel.trim() || !selectedBrand) return;
    
    try {
      await addModel(selectedBrand, newModel.trim());
      setNewModel('');
    } catch (err) {
      alert('Failed to add model: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const toggleExpand = (brandId: number) => {
    setExpandedBrands(prev => {
      const newSet = new Set(prev);
      if (newSet.has(brandId)) {
        newSet.delete(brandId);
      } else {
        newSet.add(brandId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Filter Management</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Add Brand Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Brand</h2>
          <form onSubmit={handleAddBrand} className="flex gap-3">
            <input
              type="text"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              placeholder="Enter brand name (e.g., BMW)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add
            </button>
          </form>
          <p className="text-sm text-gray-500 mt-2">
            Only brands added here will be displayed in the application.
          </p>
        </div>

        {/* Brands List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Allowed Brands ({brands.length})
          </h2>
          
          {brands.length === 0 ? (
            <p className="text-gray-500">No brands added yet. All offers will be hidden.</p>
          ) : (
            <div className="space-y-3">
              {brands.map((brand) => (
                <div key={brand.id} className="border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleBrand(brand.id, !brand.is_active)}
                        className={`transition-colors ${brand.is_active ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        {brand.is_active ? (
                          <ToggleRight className="h-6 w-6" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                      <span className={`font-medium ${brand.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                        {brand.brand_name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${brand.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {brand.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedBrand(brand.id);
                          toggleExpand(brand.id);
                        }}
                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        {expandedBrands.has(brand.id) ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${brand.brand_name}? This will also remove all model filters.`)) {
                            removeBrand(brand.id);
                          }
                        }}
                        className="p-2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Models Section */}
                  {expandedBrands.has(brand.id) && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <h3 className="font-medium text-gray-700 mb-3">Model Filters (Optional)</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Leave empty to allow all models from {brand.brand_name}
                      </p>
                      
                      {/* Add Model */}
                      <form onSubmit={handleAddModel} className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={selectedBrand === brand.id ? newModel : ''}
                          onChange={(e) => {
                            setSelectedBrand(brand.id);
                            setNewModel(e.target.value);
                          }}
                          placeholder="Enter model name"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </button>
                      </form>

                      {/* Models List */}
                      <div className="space-y-2">
                        {(models[brand.id] || []).length === 0 ? (
                          <p className="text-sm text-gray-400 italic">All models allowed</p>
                        ) : (
                          (models[brand.id] || []).map((model) => (
                            <div key={model.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                              <span className="text-sm">{model.model_name}</span>
                              <button
                                onClick={() => removeModel(brand.id, model.id)}
                                className="p-1 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Only brands added to this list will be displayed in the application</li>
            <li>You can temporarily disable a brand without removing it</li>
            <li>If you don't add any models, all models from that brand will be shown</li>
            <li>If you add specific models, only those models will be displayed</li>
            <li>Changes take effect immediately - no redeploy needed!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
