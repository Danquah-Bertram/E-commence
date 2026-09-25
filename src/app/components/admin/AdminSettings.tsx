import { useState, useEffect } from 'react';
import { User } from '../../types';
import {
  BusinessSettings,
  BusinessSettingsService,
  can,
  PERM,
} from '../../services/dataService';

import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

import {
  Settings,
  Building2,
  Phone,
  Mail,
  Clock,
  Save,
  Trash2,
  Plus,
} from 'lucide-react';

import { toast } from 'sonner';

interface Props {
  currentUser: User | null;
  isSuper: boolean;
  onNavigate: (s: any) => void;
  onMessageCountChange?: (n: number) => void;
}

export default function AdminSettings({
  currentUser,
  isSuper,
}: Props) {
  const [form, setForm] = useState<BusinessSettings>({
    name: '',
    email: '',
    phone: '',
    tagline: '',
    monFriHours: '',
    satHours: '',
    sunHours: '',
 // Branding
  logoUrl: '',
 
    // Homepage content
    homepageTitle: '',
    homepageSubtitle: '',
    homepageButtonText: '',
    homepageAboutTitle: '',
    homepageAboutText: '',

    // Homepage categories
    homepageCategories: [
      {
        name: 'Chargers & Cables',
        count: '15+',
        emoji: '⚡',
      },
      {
        name: 'Wireless Earphones',
        count: '20+',
        emoji: '🎧',
      },
      {
        name: 'Power Banks',
        count: '12+',
        emoji: '🔋',
      },
    ],

    // Homepage features
    homepageFeatures: [
      {
        title: 'Wide Selection',
        description:
          'Browse our extensive collection of phone accessories — from chargers to cases.',
      },
      {
        title: 'Secure Payments',
        description:
          'Safe online payments powered by Paystack — Cards & Mobile Money accepted.',
      },
      {
        title: 'Fast Delivery',
        description:
          'Quick and reliable delivery to your doorstep across Ghana.',
      },
      {
        title: 'Easy Checkout',
        description:
          'Simple, hassle-free checkout with instant order confirmation.',
      },
    ],
// Homepage CTA
homepageCtaTitle: 'Ready to Upgrade Your Phone Experience?',
homepageCtaDescription:
  'Join thousands of satisfied customers who trust us for the best products.',
homepageCtaButtonText: 'Start Shopping',

homepageCtaTitleColor: '#FFFFFF',
homepageCtaDescriptionColor: '#BFDBFE',
homepageCtaButtonTextColor: '#FFFFFF',
homepageCtaButtonColor: '#B91C1C',
    // Footer
    footerCopyright: '',
    footerDescription: '',
  });
const [saving, setSaving] = useState(false);
const [dirty, setDirty] = useState(false);
const [uploadingLogo, setUploadingLogo] = useState(false);
  const canEditBusiness =
    isSuper || can(currentUser, PERM.EDIT_BUSINESS_INFO);

  const canEditContact =
    isSuper || can(currentUser, PERM.EDIT_CONTACT_INFO);

  const canEditHours =
    isSuper || can(currentUser, PERM.EDIT_OPENING_HOURS);

  const canViewSettings =
    isSuper || can(currentUser, PERM.VIEW_SETTINGS);

  // --------------------------------------------------
  // LOAD SETTINGS
  // --------------------------------------------------

  useEffect(() => {
    BusinessSettingsService.get()
      .then((s) => {
        setForm((prev) => ({
          ...prev,
          ...s,

          homepageCategories:
            s.homepageCategories?.length
              ? s.homepageCategories
              : prev.homepageCategories,

          homepageFeatures:
            s.homepageFeatures?.length
              ? s.homepageFeatures
              : prev.homepageFeatures,
        }));
      })
      .catch((e) => {
        toast.error(e.message || 'Failed to load settings');
      });
  }, []);

  // --------------------------------------------------
  // GENERIC FIELD UPDATE
  // --------------------------------------------------

  const update = (
    key: keyof BusinessSettings,
    value: any
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setDirty(true);
  };
const handleLogoUpload = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    toast.error('Image files only');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const result = reader.result;

    if (typeof result !== 'string') {
      toast.error('Failed to read image');
      e.target.value = '';
      return;
    }

    update('logoUrl', result);

    toast.success('Logo uploaded successfully');
    e.target.value = '';
  };

  reader.onerror = () => {
    toast.error('Failed to read logo');
    e.target.value = '';
  };

  reader.readAsDataURL(file);
};

  // --------------------------------------------------
  // UPDATE CATEGORY
  // --------------------------------------------------

 const updateCategory = (
  index: number,
  key:
    | 'name'
    | 'count'
    | 'emoji'
    | 'nameColor'
    | 'countColor',
  value: string
) => {
  setForm((prev) => ({
    ...prev,
    homepageCategories: prev.homepageCategories.map(
      (category, i) =>
        i === index
          ? {
              ...category,
              [key]: value,
            }
          : category
    ),
  }));

  setDirty(true);
};

  // --------------------------------------------------
  // ADD CATEGORY
  // --------------------------------------------------

  const addCategory = () => {
    setForm((prev) => ({
      ...prev,
      homepageCategories: [
        ...prev.homepageCategories,
        {
          name: 'New Category',
          count: '0+',
          emoji: '📦',
        },
      ],
    }));

    setDirty(true);
  };

  // --------------------------------------------------
  // DELETE CATEGORY
  // --------------------------------------------------

  const deleteCategory = (index: number) => {
    setForm((prev) => ({
      ...prev,
      homepageCategories: prev.homepageCategories.filter(
        (_, i) => i !== index
      ),
    }));

    setDirty(true);
  };

  // --------------------------------------------------
  // UPDATE FEATURE
  // --------------------------------------------------
const updateFeature = (
  index: number,
  key:
    | 'title'
    | 'description'
    | 'titleColor'
    | 'descriptionColor',
  value: string
) => {
  setForm((prev) => ({
    ...prev,
    homepageFeatures: prev.homepageFeatures.map(
      (feature, i) =>
        i === index
          ? {
              ...feature,
              [key]: value,
            }
          : feature
    ),
  }));

  setDirty(true);
};
  // --------------------------------------------------
  // SAVE
  // --------------------------------------------------

  const save = async () => {
    try {
      setSaving(true);

      await BusinessSettingsService.update(form);

      setDirty(false);

      toast.success('Settings saved successfully');
    } catch (e: any) {
      toast.error(
        e.message || 'Failed to save settings'
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // DISCARD
  // --------------------------------------------------

  const discard = async () => {
    try {
      const s = await BusinessSettingsService.get();

      setForm((prev) => ({
        ...prev,
        ...s,

        homepageCategories:
          s.homepageCategories?.length
            ? s.homepageCategories
            : prev.homepageCategories,

        homepageFeatures:
          s.homepageFeatures?.length
            ? s.homepageFeatures
            : prev.homepageFeatures,
      }));

      setDirty(false);

      toast.success('Changes discarded');
    } catch (e: any) {
      toast.error(
        e.message || 'Failed to reload settings'
      );
    }
  };

  // --------------------------------------------------
  // PERMISSION CHECK
  // --------------------------------------------------

  if (!canViewSettings) {
    return (
      <div className="text-center py-20 text-gray-400">
        You do not have permission to view settings.
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="space-y-5 max-w-2xl">{isSuper && (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
      
        </div>

   
      </div>
    </CardContent>
  </Card>
)}
      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-blue-950">
          Business Settings
        </h2>

        {dirty && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={discard}
            >
              Discard
            </Button>

            <Button
              size="sm"
              className="bg-blue-900 hover:bg-blue-800 text-white gap-1.5"
              onClick={save}
              disabled={saving}
            >
              <Save className="w-3.5 h-3.5" />

              {saving
                ? 'Saving…'
                : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* ==================================================
          1. HOMEPAGE
      ================================================== */}

      <Card>
        <CardContent className="p-5 space-y-6">

          <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <Settings className="w-4 h-4 text-blue-900" />
            Homepage
          </h3>

          {/* ----------------------------------------------
              Homepage Main Content
          ---------------------------------------------- */}

          <div className="space-y-4">

            <h4 className="font-medium text-blue-900">
              Homepage Content
            </h4>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">
                Homepage Main Title
              </Label>

              <Input
                value={form.homepageTitle}
                onChange={(e) =>
                  update(
                    'homepageTitle',
                    e.target.value
                  )
                }
                disabled={!canEditBusiness}
                placeholder="Welcome to our store"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">
                Homepage Subtitle
              </Label>

              <Input
                value={form.homepageSubtitle}
                onChange={(e) =>
                  update(
                    'homepageSubtitle',
                    e.target.value
                  )
                }
                disabled={!canEditBusiness}
                placeholder="Quality products, great service"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">
                Homepage Button Text
              </Label>

              <Input
                value={form.homepageButtonText}
                onChange={(e) =>
                  update(
                    'homepageButtonText',
                    e.target.value
                  )
                }
                disabled={!canEditBusiness}
                placeholder="Shop Now"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">
                About Section Title
              </Label>

              <Input
                value={form.homepageAboutTitle}
                onChange={(e) =>
                  update(
                    'homepageAboutTitle',
                    e.target.value
                  )
                }
                disabled={!canEditBusiness}
                placeholder="About Us"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">
                About Section Text
              </Label>

              <textarea
                value={form.homepageAboutText}
                onChange={(e) =>
                  update(
                    'homepageAboutText',
                    e.target.value
                  )
                }
                disabled={!canEditBusiness}
                placeholder="Tell customers about your business..."
                rows={5}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

          </div>
                  {/* ==================================================
    OUR PRODUCTS
================================================== */}

<div className="border-t pt-6 space-y-4">

  <h4 className="font-medium text-blue-900">
    Our Products
  </h4>

  {/* Products Title */}
  <div className="space-y-1">

    <Label className="text-xs text-gray-500">
      Products Title
    </Label>

    <Input
      value={form.productsTitle}
      onChange={(e) =>
        update('productsTitle', e.target.value)
      }
      disabled={!canEditBusiness}
      placeholder="Our Products"
    />

  </div>

  {/* Title Color */}
  <div className="space-y-1">

    <Label className="text-xs text-gray-500">
      Title Color
    </Label>

    <div className="flex items-center gap-2">

      <Input
        type="color"
        value={form.productsTitleColor || '#172554'}
        onChange={(e) =>
          update('productsTitleColor', e.target.value)
        }
        disabled={!canEditBusiness}
        className="w-14 h-10 p-1 cursor-pointer"
      />

      <Input
        value={form.productsTitleColor || '#172554'}
        onChange={(e) =>
          update('productsTitleColor', e.target.value)
        }
        disabled={!canEditBusiness}
        placeholder="#172554"
      />

    </div>

  </div>


{/* ==================================================
    HOMEPAGE CTA
================================================== */}

<div className="border-t pt-6 space-y-4">

  <h4 className="font-medium text-blue-900">
    Homepage CTA — Upgrade Your Phone Experience
  </h4>

  <p className="text-xs text-gray-500">
    These settings control the "Ready to Upgrade Your Phone Experience?"
    section at the bottom of the homepage.
  </p>

  {/* CTA Title */}
  <div className="space-y-1">

    <Label className="text-xs text-gray-500">
      CTA Title
    </Label>

    <Input
      value={form.homepageCtaTitle}
      onChange={(e) =>
        update('homepageCtaTitle', e.target.value)
      }
      disabled={!canEditBusiness}
      placeholder="Ready to Upgrade Your Phone Experience?"
    />

  </div>

  {/* CTA Title Color */}
  <div className="space-y-1">

    <Label className="text-xs text-gray-500">
      CTA Title Color
    </Label>

    <div className="flex items-center gap-2">

      <Input
        type="color"
        value={form.homepageCtaTitleColor || '#FFFFFF'}
        onChange={(e) =>
          update('homepageCtaTitleColor', e.target.value)
        }
        disabled={!canEditBusiness}
        className="w-14 h-10 p-1 cursor-pointer"
      />

      <Input
        value={form.homepageCtaTitleColor || '#FFFFFF'}
        onChange={(e) =>
          update('homepageCtaTitleColor', e.target.value)
        }
        disabled={!canEditBusiness}
        placeholder="#FFFFFF"
      />

    </div>

  </div>

  {/* CTA Description */}
  <div className="space-y-1">

    <Label className="text-xs text-gray-500">
      CTA Description
    </Label>

    <textarea
      value={form.homepageCtaDescription}
      onChange={(e) =>
        update('homepageCtaDescription', e.target.value)
      }
      disabled={!canEditBusiness}
      placeholder="Join thousands of satisfied customers who trust us for the best products."
      rows={3}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
    />

  </div>

  {/* CTA Description Color */}
  <div className="space-y-1">

    <Label className="text-xs text-gray-500">
      CTA Description Color
    </Label>

    <div className="flex items-center gap-2">

      <Input
        type="color"
        value={form.homepageCtaDescriptionColor || '#BFDBFE'}
        onChange={(e) =>
          update('homepageCtaDescriptionColor', e.target.value)
        }
        disabled={!canEditBusiness}
        className="w-14 h-10 p-1 cursor-pointer"
      />

      <Input
        value={form.homepageCtaDescriptionColor || '#BFDBFE'}
        onChange={(e) =>
          update('homepageCtaDescriptionColor', e.target.value)
        }
        disabled={!canEditBusiness}
        placeholder="#BFDBFE"
      />

    </div>

  </div>

  {/* CTA Button Text */}
  <div className="space-y-1">

    <Label className="text-xs text-gray-500">
      CTA Button Text
    </Label>

    <Input
      value={form.homepageCtaButtonText}
      onChange={(e) =>
        update('homepageCtaButtonText', e.target.value)
      }
      disabled={!canEditBusiness}
      placeholder="Start Shopping"
    />

  </div>

  {/* CTA Button Colors */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

    {/* Button Background */}
    <div className="space-y-1">

      <Label className="text-xs text-gray-500">
        CTA Button Background Color
      </Label>

      <div className="flex items-center gap-2">

        <Input
          type="color"
          value={form.homepageCtaButtonColor || '#B91C1C'}
          onChange={(e) =>
            update('homepageCtaButtonColor', e.target.value)
          }
          disabled={!canEditBusiness}
          className="w-14 h-10 p-1 cursor-pointer"
        />

        <Input
          value={form.homepageCtaButtonColor || '#B91C1C'}
          onChange={(e) =>
            update('homepageCtaButtonColor', e.target.value)
          }
          disabled={!canEditBusiness}
          placeholder="#B91C1C"
        />

      </div>

    </div>

    {/* Button Text Color */}
    <div className="space-y-1">

      <Label className="text-xs text-gray-500">
        CTA Button Text Color
      </Label>

      <div className="flex items-center gap-2">

        <Input
          type="color"
          value={form.homepageCtaButtonTextColor || '#FFFFFF'}
          onChange={(e) =>
            update('homepageCtaButtonTextColor', e.target.value)
          }
          disabled={!canEditBusiness}
          className="w-14 h-10 p-1 cursor-pointer"
        />

        <Input
          value={form.homepageCtaButtonTextColor || '#FFFFFF'}
          onChange={(e) =>
            update('homepageCtaButtonTextColor', e.target.value)
          }
          disabled={!canEditBusiness}
          placeholder="#FFFFFF"
        />

      </div>

    </div>

  </div>

</div>










  {/* Products Description */}
  <div className="space-y-1">

    <Label className="text-xs text-gray-500">
      Products Description
    </Label>

    <textarea
      value={form.productsDescription}
      onChange={(e) =>
        update('productsDescription', e.target.value)
      }
      disabled={!canEditBusiness}
      placeholder="Browse our collection of high-quality phone accessories"
      rows={3}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
    />

  </div>

  {/* Description Color */}
  <div className="space-y-1">

    <Label className="text-xs text-gray-500">
      Description Color
    </Label>

    <div className="flex items-center gap-2">

      <Input
        type="color"
        value={form.productsDescriptionColor || '#4B5563'}
        onChange={(e) =>
          update('productsDescriptionColor', e.target.value)
        }
        disabled={!canEditBusiness}
        className="w-14 h-10 p-1 cursor-pointer"
      />

      <Input
        value={form.productsDescriptionColor || '#4B5563'}
        onChange={(e) =>
          update('productsDescriptionColor', e.target.value)
        }
        disabled={!canEditBusiness}
        placeholder="#4B5563"
      />

    </div>

  </div>

</div>
         {/* ==================================================
    OUR PRODUCTS PAGE
================================================== */}

<div className="border-t pt-6 space-y-4">

  <h4 className="font-medium text-blue-900">
    Our Products Page
  </h4>

  {/* Products Title */}
  <div className="space-y-1">
    <Label className="text-xs text-gray-500">
      Products Page Title
    </Label>

    <Input
      value={form.productsTitle}
      onChange={(e) =>
        update('productsTitle', e.target.value)
      }
      disabled={!canEditBusiness}
      placeholder="Our Products"
    />
  </div>

  {/* Products Description */}
  <div className="space-y-1">
    <Label className="text-xs text-gray-500">
      Products Page Description
    </Label>

    <textarea
      value={form.productsDescription}
      onChange={(e) =>
        update('productsDescription', e.target.value)
      }
      disabled={!canEditBusiness}
      placeholder="Browse our collection of high-quality phone accessories"
      rows={3}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
  </div>

  {/* Products Colors */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

    {/* Title Color */}
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">
        Products Title Color
      </Label>

      <div className="flex items-center gap-2">

        <Input
          type="color"
          value={form.productsTitleColor || '#172554'}
          onChange={(e) =>
            update(
              'productsTitleColor',
              e.target.value
            )
          }
          disabled={!canEditBusiness}
          className="w-14 h-10 p-1 cursor-pointer"
        />

        <Input
          value={form.productsTitleColor || '#172554'}
          onChange={(e) =>
            update(
              'productsTitleColor',
              e.target.value
            )
          }
          disabled={!canEditBusiness}
          placeholder="#172554"
        />

      </div>
    </div>

    {/* Description Color */}
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">
        Products Description Color
      </Label>

      <div className="flex items-center gap-2">

        <Input
          type="color"
          value={form.productsDescriptionColor || '#4B5563'}
          onChange={(e) =>
            update(
              'productsDescriptionColor',
              e.target.value
            )
          }
          disabled={!canEditBusiness}
          className="w-14 h-10 p-1 cursor-pointer"
        />

        <Input
          value={form.productsDescriptionColor || '#4B5563'}
          onChange={(e) =>
            update(
              'productsDescriptionColor',
              e.target.value
            )
          }
          disabled={!canEditBusiness}
          placeholder="#4B5563"
        />

      </div>
    </div>

  </div>

</div>

          {/* ==================================================
              HOMEPAGE FEATURES
          ================================================== */}

          <div className="border-t pt-6 space-y-4">

            <h4 className="font-medium text-blue-900">
              Homepage Features
            </h4>

            {form.homepageFeatures.map(
              (feature, index) => (

                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3"
                >

                  <h5 className="font-medium text-sm text-gray-700">
                    Feature {index + 1}
                  </h5>

                  <div className="space-y-1">

                    <Label className="text-xs text-gray-500">
                      Title
                    </Label>

                    <Input
                      value={feature.title}
                      onChange={(e) =>
                        updateFeature(
                          index,
                          'title',
                          e.target.value
                        )
                      }
                      disabled={!canEditBusiness}
                      placeholder="Feature title"
                    />

                  </div>

                  <div className="space-y-1">

                    <Label className="text-xs text-gray-500">
                      Description
                    </Label>

                    <textarea
                      value={feature.description}
                      onChange={(e) =>
                        updateFeature(
                          index,
                          'description',
                          e.target.value
                        )
                      }
                      disabled={!canEditBusiness}
                      rows={3}
                      placeholder="Feature description"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />

                  </div>
{/* Feature Colors */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

  <div className="space-y-1">
    <Label className="text-xs text-gray-500">
      Title Color
    </Label>

    <div className="flex items-center gap-2">
      <Input
        type="color"
        value={feature.titleColor || '#172554'}
        onChange={(e) =>
          updateFeature(
            index,
            'titleColor',
            e.target.value
          )
        }
        disabled={!canEditBusiness}
        className="w-14 h-10 p-1 cursor-pointer"
      />

      <Input
        value={feature.titleColor || '#172554'}
        onChange={(e) =>
          updateFeature(
            index,
            'titleColor',
            e.target.value
          )
        }
        disabled={!canEditBusiness}
        placeholder="#172554"
      />
    </div>
  </div>

  <div className="space-y-1">
    <Label className="text-xs text-gray-500">
      Description Color
    </Label>

    <div className="flex items-center gap-2">
      <Input
        type="color"
        value={feature.descriptionColor || '#4B5563'}
        onChange={(e) =>
          updateFeature(
            index,
            'descriptionColor',
            e.target.value
          )
        }
        disabled={!canEditBusiness}
        className="w-14 h-10 p-1 cursor-pointer"
      />

      <Input
        value={feature.descriptionColor || '#4B5563'}
        onChange={(e) =>
          updateFeature(
            index,
            'descriptionColor',
            e.target.value
          )
        }
        disabled={!canEditBusiness}
        placeholder="#4B5563"
      />
    </div>
  </div>

</div>
                </div>

              )
            )}

          </div>

        {/* ==================================================
              SHOP BY CATEGORY
          ================================================== */}

          <div className="border-t pt-6 space-y-4">

            <div className="flex items-center justify-between">

              <div>
                <h4 className="font-medium text-blue-900">
                  Shop by Category
                </h4>

                <p className="text-xs text-gray-500 mt-1">
                  These categories appear on the homepage.
                </p>
              </div>

              {canEditBusiness && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addCategory}
                  className="gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              )}

            </div>

            <div className="space-y-4">

              {form.homepageCategories.map(
                (category, index) => (

                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-3"
                  >

                    <div className="flex items-center justify-between">

                      <h5 className="font-medium text-sm text-gray-700">
                        Category {index + 1}
                      </h5>

                      {canEditBusiness &&
                        form.homepageCategories.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              deleteCategory(index)
                            }
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}

                    </div>

                    <div className="grid grid-cols-[70px_1fr] gap-3">

                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">
                          Emoji
                        </Label>

                        <Input
                          value={category.emoji}
                          onChange={(e) =>
                            updateCategory(
                              index,
                              'emoji',
                              e.target.value
                            )
                          }
                          disabled={!canEditBusiness}
                          placeholder="⚡"
                          className="text-center text-xl"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">
                          Category Name
                        </Label>

                        <Input
                          value={category.name}
                          onChange={(e) =>
                            updateCategory(
                              index,
                              'name',
                              e.target.value
                            )
                          }
                          disabled={!canEditBusiness}
                          placeholder="Chargers & Cables"
                        />
                      </div>

                    </div>

                    <div className="space-y-1">

                      <Label className="text-xs text-gray-500">
                        Product Count
                      </Label>

                      <Input
                        value={category.count}
                        onChange={(e) =>
                          updateCategory(
                            index,
                            'count',
                            e.target.value
                          )
                        }
                        disabled={!canEditBusiness}
                        placeholder="15+"
                      />

                    </div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

  <div className="space-y-1">
    <Label className="text-xs text-gray-500">
      Category Name Color
    </Label>

    <div className="flex items-center gap-2">
      <Input
        type="color"
        value={category.nameColor || '#172554'}
        onChange={(e) =>
          updateCategory(
            index,
            'nameColor',
            e.target.value
          )
        }
        disabled={!canEditBusiness}
        className="w-14 h-10 p-1 cursor-pointer"
      />

      <Input
        value={category.nameColor || '#172554'}
        onChange={(e) =>
          updateCategory(
            index,
            'nameColor',
            e.target.value
          )
        }
        disabled={!canEditBusiness}
        placeholder="#172554"
      />
    </div>
  </div>

  <div className="space-y-1">
    <Label className="text-xs text-gray-500">
      Product Count Color
    </Label>

    <div className="flex items-center gap-2">
      <Input
        type="color"
        value={category.countColor || '#6B7280'}
        onChange={(e) =>
          updateCategory(
            index,
            'countColor',
            e.target.value
          )
        }
        disabled={!canEditBusiness}
        className="w-14 h-10 p-1 cursor-pointer"
      />

      <Input
        value={category.countColor || '#6B7280'}
        onChange={(e) =>
          updateCategory(
            index,
            'countColor',
            e.target.value
          )
        }
        disabled={!canEditBusiness}
        placeholder="#6B7280"
      />
    </div>
  </div>

</div>

                  </div>

                )
              )}

            </div>

          </div>

{/* ==================================================
    2. BRANDING
================================================== */}

<Card>
  <CardContent className="p-5 space-y-5">

    <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
      <Building2 className="w-4 h-4 text-blue-900" />
      Branding
    </h3>

    <p className="text-xs text-gray-500">
      Configure the logos displayed across your website.
    </p>
{/* Business Name */}
<div className="space-y-2">

  <Label className="text-xs text-gray-500">
    Business Name
  </Label>

  <Input
    value={form.name || ''}
    onChange={(e) =>
      update('name', e.target.value)
    }
    disabled={!canEditBusiness}
    placeholder="Prayer is the Key Ventures"
  />

</div>
 {/* Main Logo */}
<div className="space-y-4">

  <Label className="text-xs text-gray-500">
    Main Logo
  </Label>

  {/* Logo URL */}
  <div className="space-y-2">
    <Label className="text-xs text-gray-500">
      Logo URL
    </Label>

    <Input
      type="url"
      value={form.logoUrl || ''}
      onChange={(e) =>
        update('logoUrl', e.target.value)
      }
      disabled={!canEditBusiness}
      placeholder="https://example.com/logo.png"
    />
  </div>

  {/* OR upload a logo */}
  <div className="space-y-2">
    <Label className="text-xs text-gray-500">
      Or Upload Logo
    </Label>

    <Input
      type="file"
      accept="image/png,image/jpeg,image/webp,image/svg+xml"
      onChange={handleLogoUpload}
      disabled={!canEditBusiness || uploadingLogo}
    />

    {uploadingLogo && (
      <p className="text-sm text-gray-500">
        Uploading logo...
      </p>
    )}
  </div>

  {/* Logo Preview */}
  {form.logoUrl && (
    <div className="border rounded-lg p-4 bg-gray-50">
      <p className="text-xs text-gray-500 mb-2">
        Main Logo Preview
      </p>

      <img
        src={form.logoUrl}
        alt="Main logo preview"
        className="max-h-20 max-w-[240px] object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  )}

</div>

  </CardContent>
</Card>



      {/* ==================================================
          2. CONTACT
      ================================================== */}

      <Card>
        <CardContent className="p-5 space-y-4">

          <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-blue-900" />
            Contact
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">

            <div className="space-y-1">

              <Label className="text-xs text-gray-500 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Email
              </Label>

              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  update('email', e.target.value)
                }
                disabled={!canEditContact}
                placeholder="contact@business.com"
              />

            </div>

            <div className="space-y-1">

              <Label className="text-xs text-gray-500 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Phone
              </Label>

              <Input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  update('phone', e.target.value)
                }
                disabled={!canEditContact}
                placeholder="0XX XXX XXXX"
              />

            </div>

          </div>

        </CardContent>
      </Card>

      {/* ==================================================
          3. OPENING HOURS
      ================================================== */}

      <Card>
        <CardContent className="p-5 space-y-4">

          <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-blue-900" />
            Opening Hours
          </h3>

          <div className="space-y-3">

            <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-2 sm:gap-3">

              <Label className="text-xs text-gray-500">
                Mon – Fri
              </Label>

              <Input
                value={form.monFriHours}
                onChange={(e) =>
                  update(
                    'monFriHours',
                    e.target.value
                  )
                }
                disabled={!canEditHours}
                placeholder="8:00 AM – 6:00 PM"
              />

            </div>

          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-2 sm:gap-3">
              <Label className="text-xs text-gray-500">
                Saturday
              </Label>

              <Input
                value={form.satHours}
                onChange={(e) =>
                  update(
                    'satHours',
                    e.target.value
                  )
                }
                disabled={!canEditHours}
                placeholder="9:00 AM – 4:00 PM"
              />

            </div>

           <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-2 sm:gap-3">

              <Label className="text-xs text-gray-500">
                Sunday
              </Label>

              <Input
                value={form.sunHours}
                onChange={(e) =>
                  update(
                    'sunHours',
                    e.target.value
                  )
                }
                disabled={!canEditHours}
                placeholder="Closed"
              />

            </div>

          </div>

        </CardContent>
      </Card>

   {/* ==================================================
              FOOTER
          ================================================== */}

          <div className="border-t pt-6 space-y-4">

            <h4 className="font-medium text-blue-900">
              Footer Content
            </h4>

            <div className="space-y-1">

              <Label className="text-xs text-gray-500">
                Footer Copyright
              </Label>

            <Input
  value={form.footerCopyright}
  onChange={(e) =>
    update(
      'footerCopyright',
      e.target.value
    )
  }
  disabled={!canEditBusiness}
  placeholder="© 2026 Prayer Is The Key Ventures. All rights reserved."
  className="w-full min-w-0"
/>
            </div>

            <div className="space-y-1">

              <Label className="text-xs text-gray-500">
                Footer Description
              </Label>

              <textarea
                value={form.footerDescription}
                onChange={(e) =>
                  update(
                    'footerDescription',
                    e.target.value
                  )
                }
                disabled={!canEditBusiness}
                placeholder="Quality phone accessories delivered to your door."
                rows={3}
              className="w-full min-w-0 rounded-md border border-gray-300 px-3 py-2 text-sm resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
              />

            </div>

          </div>

        </CardContent>
      </Card>

      {/* ==================================================
          SAVE CHANGES
      ================================================== */}

   {(canEditBusiness ||
  canEditContact ||
  canEditHours) && (

  <div className="w-full flex justify-end">

    <Button
      className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800 text-white gap-1.5"
      onClick={save}
      disabled={saving || !dirty}
    >

      <Save className="w-4 h-4" />

      {saving
        ? 'Saving…'
        : dirty
        ? 'Save Changes'
        : 'Saved'}

    </Button>

  </div>

)}

      {/* Permission notice */}

      {!canEditBusiness &&
        !canEditContact &&
        !canEditHours && (

          <p className="text-sm text-gray-400 text-center">
            You have view-only access to settings.
          </p>

        )}

    </div>
  );
}