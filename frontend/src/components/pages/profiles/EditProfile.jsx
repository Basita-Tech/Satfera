import { useState } from 'react';
import { TabsComponent } from '../../TabsComponent';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { ArrowLeft, Save } from 'lucide-react';

export function EditProfile({ onNavigateBack }) {
  const [activeTab, setActiveTab] = useState('personal');

  const tabs = [
    { key: 'personal', label: 'Personal Details' },
    { key: 'family', label: 'Family Details' },
    { key: 'education', label: 'Educational Details' },
    { key: 'lifestyle', label: 'Health & Lifestyle' },
    { key: 'expectations', label: 'Expectation Details' }
  ];

  // ---------------------------------------
  // PERSONAL DETAILS TAB
  // ---------------------------------------
  const renderPersonalDetails = () => (
    <div className="space-y-6">
      {/* Full Name + DOB */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Full Name *</Label>
          <Input defaultValue="Rajesh Kumar" className="rounded-[12px]" />
        </div>
        <div className="space-y-2">
          <Label>Date of Birth *</Label>
          <Input type="date" defaultValue="1996-05-15" className="rounded-[12px]" />
        </div>
      </div>

      {/* Gender + Marital Status */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Gender *</Label>
          <Select defaultValue="male">
            <SelectTrigger className="rounded-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Marital Status *</Label>
          <Select defaultValue="never-married">
            <SelectTrigger className="rounded-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never-married">Never Married</SelectItem>
              <SelectItem value="divorced">Divorced</SelectItem>
              <SelectItem value="widowed">Widowed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Height + Weight + Blood Group */}
      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Height *</Label>
          <Select defaultValue="5-10">
            <SelectTrigger className="rounded-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5-4">5'4"</SelectItem>
              <SelectItem value="5-5">5'5"</SelectItem>
              <SelectItem value="5-6">5'6"</SelectItem>
              <SelectItem value="5-7">5'7"</SelectItem>
              <SelectItem value="5-8">5'8"</SelectItem>
              <SelectItem value="5-9">5'9"</SelectItem>
              <SelectItem value="5-10">5'10"</SelectItem>
              <SelectItem value="5-11">5'11"</SelectItem>
              <SelectItem value="6-0">6'0"</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Weight (kg) *</Label>
          <Input type="number" defaultValue="75" className="rounded-[12px]" />
        </div>

        <div className="space-y-2">
          <Label>Blood Group</Label>
          <Select defaultValue="o-positive">
            <SelectTrigger className="rounded-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a-positive">A+</SelectItem>
              <SelectItem value="a-negative">A-</SelectItem>
              <SelectItem value="b-positive">B+</SelectItem>
              <SelectItem value="b-negative">B-</SelectItem>
              <SelectItem value="o-positive">O+</SelectItem>
              <SelectItem value="o-negative">O-</SelectItem>
              <SelectItem value="ab-positive">AB+</SelectItem>
              <SelectItem value="ab-negative">AB-</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Religion + Caste */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Religion *</Label>
          <Select defaultValue="hindu">
            <SelectTrigger className="rounded-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hindu">Hindu</SelectItem>
              <SelectItem value="muslim">Muslim</SelectItem>
              <SelectItem value="christian">Christian</SelectItem>
              <SelectItem value="sikh">Sikh</SelectItem>
              <SelectItem value="jain">Jain</SelectItem>
              <SelectItem value="buddhist">Buddhist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Caste *</Label>
          <Input defaultValue="Brahmin" className="rounded-[12px]" />
        </div>
      </div>

      {/* Mother Tongue + Gotra */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Mother Tongue *</Label>
          <Input defaultValue="Hindi" className="rounded-[12px]" />
        </div>

        <div className="space-y-2">
          <Label>Gotra</Label>
          <Input placeholder="Enter Gotra" className="rounded-[12px]" />
        </div>
      </div>

      {/* About Me */}
      <div className="space-y-2">
        <Label>About Me</Label>
        <Textarea
          placeholder="Write a brief description about yourself..."
          className="rounded-[12px] min-h-[120px]"
          defaultValue="I am a software engineer working in Mumbai. I enjoy traveling, reading, and spending time with family."
        />
      </div>
    </div>
  );

  // ---------------------------------------
  // FAMILY DETAILS TAB
  // ---------------------------------------
  const renderFamilyDetails = () => (
    <div className="space-y-6">
      {/* Parents */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Father's Name</Label>
          <Input placeholder="Enter father's name" className="rounded-[12px]" />
        </div>
        <div className="space-y-2">
          <Label>Father's Occupation</Label>
          <Input placeholder="Enter occupation" className="rounded-[12px]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Mother's Name</Label>
          <Input placeholder="Enter mother's name" className="rounded-[12px]" />
        </div>
        <div className="space-y-2">
          <Label>Mother's Occupation</Label>
          <Input placeholder="Enter occupation" className="rounded-[12px]" />
        </div>
      </div>

      {/* Family Type + Status */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Family Type *</Label>
          <Select defaultValue="nuclear">
            <SelectTrigger className="rounded-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nuclear">Nuclear Family</SelectItem>
              <SelectItem value="joint">Joint Family</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Family Status</Label>
          <Select defaultValue="middle">
            <SelectTrigger className="rounded-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="middle">Middle Class</SelectItem>
              <SelectItem value="upper-middle">Upper Middle Class</SelectItem>
              <SelectItem value="rich">Rich</SelectItem>
              <SelectItem value="affluent">Affluent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Siblings */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Number of Brothers</Label>
          <Input type="number" defaultValue="1" className="rounded-[12px]" />
        </div>
        <div className="space-y-2">
          <Label>Number of Sisters</Label>
          <Input type="number" defaultValue="0" className="rounded-[12px]" />
        </div>
      </div>

      {/* Family Location */}
      <div className="space-y-2">
        <Label>Family Location</Label>
        <Input placeholder="City, State" defaultValue="Mumbai, Maharashtra" className="rounded-[12px]" />
      </div>

      {/* About Family */}
      <div className="space-y-2">
        <Label>About Family</Label>
        <Textarea placeholder="Write about your family values, traditions..." className="rounded-[12px] min-h-[120px]" />
      </div>
    </div>
  );

  // ---------------------------------------
  // EDUCATION / CAREER TAB
  // ---------------------------------------
  const renderEducationDetails = () => (
    <div className="space-y-6">
      {/* Highest Qualification */}
      <div className="space-y-2">
        <Label>Highest Qualification *</Label>
        <Select defaultValue="btech">
          <SelectTrigger className="rounded-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="diploma">Diploma</SelectItem>
            <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
            <SelectItem value="btech">B.Tech</SelectItem>
            <SelectItem value="mtech">M.Tech</SelectItem>
            <SelectItem value="masters">Master's Degree</SelectItem>
            <SelectItem value="phd">PhD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* College */}
      <div className="space-y-2">
        <Label>College / University</Label>
        <Input placeholder="Enter institute name" className="rounded-[12px]" />
      </div>

      {/* Occupation */}
      <div className="space-y-2">
        <Label>Occupation *</Label>
        <Select defaultValue="software-engineer">
          <SelectTrigger className="rounded-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="software-engineer">Software Engineer</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="banker">Banker</SelectItem>
            <SelectItem value="self-employed">Self Employed</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Company + Salary */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Company Name</Label>
          <Input placeholder="Enter company name" className="rounded-[12px]" />
        </div>
        <div className="space-y-2">
          <Label>Annual Income (₹)</Label>
          <Input type="number" placeholder="e.g., 800000" className="rounded-[12px]" />
        </div>
      </div>
    </div>
  );

  // ---------------------------------------
  // LIFESTYLE TAB
  // ---------------------------------------
  const renderLifestyleDetails = () => (
    <div className="space-y-6">
      {/* Habits */}
      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Diet *</Label>
          <Select defaultValue="veg">
            <SelectTrigger className="rounded-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="veg">Vegetarian</SelectItem>
              <SelectItem value="non-veg">Non Vegetarian</SelectItem>
              <SelectItem value="eggetarian">Eggetarian</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Smoking *</Label>
          <Select defaultValue="no">
            <SelectTrigger className="rounded-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="occasionally">Occasionally</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Drinking *</Label>
          <Select defaultValue="no">
            <SelectTrigger className="rounded-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="occasionally">Occasionally</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Health */}
      <div className="space-y-2">
        <Label>Any Health Issues?</Label>
        <Textarea placeholder="Describe if any..." className="rounded-[12px] min-h-[120px]" />
      </div>
    </div>
  );

  // ---------------------------------------
  // EXPECTATION TAB
  // ---------------------------------------
  const renderExpectations = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Partner Expectations</Label>
        <Textarea
          placeholder="Describe partner expectations..."
          className="rounded-[12px] min-h-[120px]"
        />
      </div>

      <div className="space-y-2 flex items-center gap-3">
        <Checkbox />
        <Label>Show my contact details to shortlisted profiles</Label>
      </div>
    </div>
  );

  // ---------------------------------------
  // MAIN UI
  // ---------------------------------------
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="bg-white rounded-[24px] shadow-md border border-[#e5e5e5] p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onNavigateBack} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold">Edit Profile</h2>
      </div>

      {/* Tabs */}
      <TabsComponent tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      <div className="mt-8">
        {activeTab === 'personal' && renderPersonalDetails()}
        {activeTab === 'family' && renderFamilyDetails()}
        {activeTab === 'education' && renderEducationDetails()}
        {activeTab === 'lifestyle' && renderLifestyleDetails()}
        {activeTab === 'expectations' && renderExpectations()}
      </div>

      {/* Action Buttons */}
      <div className="mt-10 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onNavigateBack}
          className="rounded-[12px] px-6 py-3 text-base border-[#C8A227] text-[#C8A227] hover:bg-[#C8A227] hover:text-white transition-colors"
        >
          Cancel
        </Button>
        <Button className="rounded-[12px] px-6 py-3 text-base flex items-center gap-2 bg-[#C8A227] hover:bg-[#B49520] text-white">
          <Save size={18} />
          Save Changes
        </Button>
      </div>
      </div>
    </div>
  );
}
