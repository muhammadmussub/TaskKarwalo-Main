-- Create content management tables for editable website content
-- This allows admins to edit About page, policies, FAQs, etc.

-- Table for storing editable content sections
CREATE TABLE IF NOT EXISTS content_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section_key VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'text', -- text, html, markdown
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing contact information
CREATE TABLE IF NOT EXISTS contact_information (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing FAQs
CREATE TABLE IF NOT EXISTS faqs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing policy documents
CREATE TABLE IF NOT EXISTS policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_key VARCHAR(100) NOT NULL UNIQUE, -- privacy_policy, terms_of_service, etc.
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default content for About page
INSERT INTO content_sections (section_key, title, content, content_type) VALUES
('about_main', 'About TaskKarwalo', 'TaskKarwalo is a platform connecting users with local service providers. Our mission is to simplify the process of finding and booking reliable services while creating opportunities for skilled professionals to grow their business.

We are committed to providing a secure, transparent, and user-friendly marketplace for both customers and service providers. Through our platform, we aim to support local communities and contribute to economic growth by facilitating service-based transactions.', 'text'),

('project_info', 'Project Information', 'TaskKarwalo is a web application built with modern technologies to provide a seamless experience for users seeking services and professionals offering them.', 'text')

ON CONFLICT (section_key) DO NOTHING;

-- Insert default contact information
INSERT INTO contact_information (email, phone, address, website) VALUES
('contact@tasktap.com', '+92 300 1234567', 'Islamabad, Pakistan', 'www.tasktap.com')

ON CONFLICT DO NOTHING;

-- Insert default FAQs
INSERT INTO faqs (question, answer, category, sort_order) VALUES
('How do I book a service?', 'To book a service, simply browse our categories, select a service provider, choose your preferred date and time, and confirm your booking. You can also chat with providers before booking.', 'Booking', 1),
('How do I become a service provider?', 'To become a service provider, click on "Join as Provider" and complete your business profile with all required documents. Our team will review and approve your application within 24 hours.', 'Providers', 1),
('What payment methods are accepted?', 'We accept various payment methods including cash, bank transfers, and digital wallets. Payment terms are agreed upon between customers and service providers.', 'Payments', 1),
('How do I contact customer support?', 'You can contact our support team through the "Contact Support" section in the app or by emailing us at contact@tasktap.com.', 'Support', 1)

ON CONFLICT DO NOTHING;

-- Insert default policies
INSERT INTO policies (policy_key, title, content, version) VALUES
('privacy_policy', 'Privacy Policy', 'This privacy policy explains how we collect, use, and protect your personal information when you use our platform.', '1.0'),
('terms_of_service', 'Terms of Service', 'These terms of service govern your use of TaskKarwalo platform and services.', '1.0'),
('user_guidelines', 'User Guidelines', 'Please follow these guidelines to ensure a positive experience for all users on our platform.', '1.0')

ON CONFLICT (policy_key) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_sections_key ON content_sections(section_key);
CREATE INDEX IF NOT EXISTS idx_content_sections_active ON content_sections(is_active);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(is_active);
CREATE INDEX IF NOT EXISTS idx_policies_key ON policies(policy_key);
CREATE INDEX IF NOT EXISTS idx_policies_active ON policies(is_active);

-- Enable RLS
ALTER TABLE content_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_sections
CREATE POLICY "Public read access for content_sections" ON content_sections
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access for content_sections" ON content_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for contact_information
CREATE POLICY "Public read access for contact_information" ON contact_information
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access for contact_information" ON contact_information
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for faqs
CREATE POLICY "Public read access for faqs" ON faqs
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access for faqs" ON faqs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for policies
CREATE POLICY "Public read access for policies" ON policies
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access for policies" ON policies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_sections_updated_at
    BEFORE UPDATE ON content_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_information_updated_at
    BEFORE UPDATE ON contact_information
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faqs_updated_at
    BEFORE UPDATE ON faqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policies_updated_at
    BEFORE UPDATE ON policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();