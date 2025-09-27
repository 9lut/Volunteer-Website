'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Users, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/axios';

export interface FilterOptions {
  search: string;
  location: string;
  dateStart: string;
  dateEnd: string;
  clubId: string;
}

interface FilterData {
  clubs: Array<{ id: string; name: string }>;
  locations: string[];
}

interface ActivityFilterProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onApplyFilters: () => void;
  isLoading?: boolean;
  buttonText?: string;
  placeholder?: string;
}

export default function ActivityFilter({ 
  filters, 
  onFiltersChange, 
  onApplyFilters,
  isLoading = false,
  buttonText = 'ค้นหา',
  placeholder = 'ค้นหาชื่อกิจกรรม รายละเอียด หรือชมรม...'
}: ActivityFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterData, setFilterData] = useState<FilterData>({ clubs: [], locations: [] });
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setIsLoadingOptions(true);
        const response = await api.get('/api/activities/filters');
        setFilterData(response.data);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadFilterOptions();
  }, []);

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      location: '',
      dateStart: '',
      dateEnd: '',
      clubId: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value.trim() !== '');
  const activeFilterCount = Object.values(filters).filter(value => value.trim() !== '').length;

  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        {/* Search Bar - Always Visible */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={placeholder}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onApplyFilters();
                }
              }}
            />
          </div>
          
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="outline"
            className="cursor-pointer px-4 py-3 rounded-xl border-gray-300 hover:bg-gray-50 relative"
          >
            <Filter className="w-4 h-4 mr-2" />
            ตัวกรอง
            {activeFilterCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          
          <Button
            onClick={onApplyFilters}
            className="cursor-pointer px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                กำลังค้นหา...
              </>
            ) : (
              buttonText
            )}
          </Button>
        </div>

        {/* Advanced Filters - Collapsible */}
        {isExpanded && (
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  สถานที่
                </label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isLoadingOptions}
                >
                  <option value="">ทุกสถานที่</option>
                  {filterData.locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Club Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  ชมรมผู้จัด
                </label>
                <select
                  value={filters.clubId}
                  onChange={(e) => handleFilterChange('clubId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isLoadingOptions}
                >
                  <option value="">ทุกชมรม</option>
                  {filterData.clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Start Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  วันที่เริ่มต้น
                </label>
                <input
                  type="date"
                  value={filters.dateStart}
                  onChange={(e) => handleFilterChange('dateStart', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Date End Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  value={filters.dateEnd}
                  onChange={(e) => handleFilterChange('dateEnd', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <>
                    <span className="text-sm text-gray-600">
                      กรองแล้ว {activeFilterCount} รายการ
                    </span>
                    <Button
                      onClick={clearAllFilters}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      ล้างทั้งหมด
                    </Button>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setIsExpanded(false)}
                  variant="ghost"
                  size="sm"
                  className='cursor-pointer'
                >
                  ซ่อนตัวกรอง
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && !isExpanded && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filters.search && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Search className="w-3 h-3" />
                ค้นหา: {filters.search}
                <Button
                  onClick={() => handleFilterChange('search', '')}
                  className="cursor-pointer ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            
            {filters.location && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                สถานที่: {filters.location}
                <Button
                  onClick={() => handleFilterChange('location', '')}
                  className="cursor-pointer ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            
            {filters.clubId && (
              <Badge variant="secondary" className="cursor-pointer flex items-center gap-1">
                <Users className="w-3 h-3" />
                ชมรม: {filterData.clubs.find(c => c.id === filters.clubId)?.name}
                <Button
                  onClick={() => handleFilterChange('clubId', '')}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            
            {(filters.dateStart || filters.dateEnd) && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                วันที่: {filters.dateStart} {filters.dateStart && filters.dateEnd && '-'} {filters.dateEnd}
                <Button
                  onClick={() => {
                    handleFilterChange('dateStart', '');
                    handleFilterChange('dateEnd', '');
                  }}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
