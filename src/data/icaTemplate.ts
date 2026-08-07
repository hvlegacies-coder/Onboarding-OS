import type { ContractTemplate } from '../types'

/**
 * The Independent Contractor Agreement, transcribed from the executed PDF.
 *
 * The legal wording is reproduced verbatim — including "principle place of
 * business" — because changing the text of a contract is the client's call,
 * not ours. Only the blanks became {{merge_fields}}.
 *
 * Fields fall into three groups:
 *   • Office fields   — the owner fills these in once (listed in `fields`).
 *   • Derived fields  — computed from the agreement date / branding.
 *   • Signer fields   — the contractor completes these when signing
 *                       (preparer_name, preparer_address, preparer_city).
 */
export const ICA_TEMPLATE: ContractTemplate = {
  id: 'ica-standard',
  name: 'Independent Contractor Agreement',
  shortName: 'Contractor Agreement',
  version: '2026.1',
  updatedAt: '2026-08-07',

  /**
   * No extra office fields. Everything the office supplies comes from the
   * standard branding-and-details panel; the commission terms are fixed
   * wording in the agreement, exactly as they are in the source PDF.
   */
  fields: [],

  // Blanks the contractor fills in at signing rather than the office.
  optionalFields: ['preparer_city'],

  sections: [
    {
      id: 'intro',
      heading: 'THIS INDEPENDENT CONTRACTOR AGREEMENT',
      body: '("Agreement") is made and entered into as of the {{intro_day}} day of {{intro_month}}, 20{{intro_year}} by and between {{entity_name}}, whose principle place of business is {{business_address}} ("We", "Us", or "Company") and {{preparer_name}} whose principle place of business is {{preparer_address}} ("You" or "Contractor") (Collectively, the "Parties").',
    },
    {
      id: 'witnesseth',
      heading: 'WITNESSETH, that:',
      body: 'WHEREAS, the Company desires to hire Contractor for its tax preparation services at the Location upon the terms and conditions hereinafter set forth in this Agreement; and\n\nWHEREAS, Contractor agrees to accept the role as the independent contractor with the Company upon the terms and conditions hereinafter set forth in this Agreement.\n\nNOW, THEREFORE, in consideration of the promises set forth herein above and the mutual promises herein contained, the parties agree as follows:',
    },
    {
      id: 's1',
      heading: '1. Engagement-',
      body: 'We shall engage you as an independent contractor at the Location with such duties and responsibilities as are set forth herein and as are from time to time prescribed by us, and you hereby accept and agree to such engagement, on the terms and conditions hereinafter set forth.',
    },
    {
      id: 's2',
      heading: '2. Purpose-',
      body: 'The purpose of this Agreement is for Contractor to offer income tax preparation, income tax filing, and refund fulfillment services (the "Services") to its existing customers with Company\'s assistance using financial products and services offered through Company. Notwithstanding the foregoing, it is expressly understood that Contractor is offering the Services on behalf of the Company and utilizing its Location as a customer data entry site. Contractor is not permitted to prepare or file tax returns on behalf of customers.',
    },
    {
      id: 's3',
      heading: '3. Authority and Relationship of the Parties-',
      body: 'The Parties of this Agreement recognize that this Agreement does not create any actual or apparent agency, partnership, franchise, or relationship of employer and employee between the parties. The relationship created by this Agreement is that of an independent contractor, and no fiduciary or other special relationship is created or intended. You are not authorized to enter into or commit the Company to any agreements, and you shall not represent yourself as the agent or legal representative of the Company. You must indicate clearly the independent ownership of your business in all public records and in all of your dealings with third parties. This Agreement is non-exclusive, which means you may face competition from other independent contractors or employees of the Company.',
    },
    {
      id: 's4',
      heading: '4. Term-',
      body: 'The term of this Agreement shall commence on {{commencement_date}}, 20{{intro_year}} (the "Commencement Date") and will expire on April 30, 20{{expiration_year}} provided however, that you are only authorized to offer the Products and Services during the months of December through April during the term. The Parties will have the mutual option to renew the Agreement for successive one (1) year periods on the same terms and conditions set forth herein.',
      // expiration_year is derived from the agreement date and term length.
    },
    {
      id: 's5',
      heading: '5. Duties-',
      body: 'a. Company Duties — We shall provide the necessary support and access to proprietary materials required to successfully offer the Services. In addition, we will provide an IRS Electronic Filer Identification Number ("EFIN") for use by you. The EFIN will be in the name of the Company to be used solely at the Location.\n\nb. Contractor Duties — You agree to target your existing customers/clients for the Services and shall provide the necessary hardware (i.e. computer, printer, etc.) and utilities (i.e. electricity, telephone, internet connection, etc.) to properly run software to support the Services. Either the Company or an independent tax preparer will sign the tax returns as the paid tax preparer using their own Personal Tax Identification Number ("PTIN") or social security number as identification. We will be responsible for obtaining PTINs from the IRS.',
    },
    {
      id: 's6',
      heading: '6. Compensation-',
      body: 'You will receive commission payments based upon the percentage of the gross revenue collected from the tax preparation fees according to the volume/fees of your own customers/clients serviced. Your commission will be 30% of the preparation fee for customer/client(s) 1 through 50 that you service. Your commission payments will increase from 30% to 40% of the total tax preparation fee for all customers/clients if you are able to provide more than 50 processed clients before the given tax year\'s first initial deposit of funds from the IRS. Commissions will be paid out weekly after the initial deposit funds from the IRS.\n\na. Higher Executive Plan — In an attempt to foster future office owners, the stated plan will be active to those associates who invite/introduce other independent contractors. At which point the associate will receive a referral based percentage of 5% of preparation fees for the first tax season of the new preparers personal clients. New preparers must agree to such terms, and all fees will be paid accordingly during payout.\n\nb. Irrespective of the above compensation or commission to be earned, should you neglect to perform or meet the necessary service requirement with respect to any of the customers/clients that are serviced, the commission earned for that customer/client shall be decreased to 10% of the tax preparation fee irrespective of whether or not that customer/client entitled you to a commission of any percentage. Office clients which are provided to you by the company pay a flat rate of $100.\n\nc. NO PAYMENTS RELEASED UNLESS ALL FILES ARE IN COMPLIANCE BY THE FIRST INITIAL DEPOSIT FROM THE IRS.\n\nd. ALL PERCENTAGES ARE BASED ON FUNDS RELEASED FROM THE IRS AFTER FEES.',
    },
    {
      id: 's7',
      heading: '7. Costs and Expenses-',
      body: 'You will be financially responsible for all costs associated with labor, marketing materials, equipment, software/training and communication expenses (i.e. phone, internet, etc.).',
    },
    {
      id: 's8',
      heading: '8. Right to Publicity-',
      body: 'We will have the right to photograph/video record you and your personnel to use the photographs in any of our publicity or advertising programs.',
    },
    {
      id: 's9',
      heading: '9. Contractor Restrictions',
      body: 'a. Laws, IRS Rules and Regulations\n\ni. E-Filing — You are not permitted to prepare or file tax returns on behalf of customers. Notwithstanding the foregoing, you must adhere to all Internal Revenue Service (IRS) Code, Rules and Regulations, including, without limitation, the requirements described in IRS Publication 1345 (Handbook for Authorized IRS e-file providers).\n\nii. Customer Data — You acknowledge and agree that you will comply with all applicable use and disclosure laws regarding the protection of customer information, including Internal Revenue Service (IRS) Regulation 7216, which regulates the use and disclosure of a tax customer\'s information, for non-related financial products. You hereby agree to have your customers sign all necessary documentation, as we may set forth in written or electronic communications from time to time in order to comply with all applicable use and disclosure laws. You will be required to safeguard all pertinent customer documentation for up to five (5) years at the Location as required by the IRS, unless Company arranges for pickup or delivery of such documentation at the Company\'s expense. In the event that you shut down your Location or intend to abandon your Location, you are required to provide at least thirty (30) days written notice to Company so that they can arrange for pickup or delivery of such documentation at the Company\'s expense.\n\niii. Federal, State, and Local laws — You must comply with all applicable Federal, State, and local laws, regulations, and ordinances. This includes all Federal, State, and local laws and regulations governing the provision of tax preparation services and/or refund anticipation loans ("RALs"). You also are required to comply with all Federal, State, and local laws and regulations which apply generally to all businesses, which include, without limitation, zoning laws, consumer protection laws, false advertising and deceptive trade practice laws, state wage and hour laws, the Americans with Disabilities Act, employment laws, the Patriot Act, Gramm-Leach-Bailey Act, and the Occupational Safety and Health Act.',
    },
    {
      id: 's10',
      heading: '10. Confidential Information',
      body: 'a. Company possesses (and will continue to develop and acquire) certain confidential information, some of which constitutes trade secrets under applicable law (the "Confidential Information"), relating to tax preparation, tax filing, and refund fulfillment services, including (without limitations): methods, formats, specifications, standards, systems, procedures, sales and marketing techniques; methods of operations; marketing and advertising programs; knowledge of suppliers of refund fulfillment products; any computer software proprietary to the Company; customer lists and other data regarding our customers; and graphic designs and related intellectual property. If we include any matter in Confidential Information, anyone who claims that it is not Confidential Information shall have the burden to prove otherwise.\n\nb. You acknowledge and agree that you will not acquire any interest in Confidential Information, other than the right to use it as we specify during the Agreement\'s term, and that Confidential Information is proprietary and is disclosed to you only on the condition that you agree that you: will not use Confidential Information in any other business or capacity; will keep each item absolutely confidential, both during this Agreement\'s term and thereafter for as long as the item is not generally known in the tax preparation industry; and will not make unauthorized copies of any Confidential Information disclosed via electronic medium or in written or other tangible form.',
    },
    {
      id: 's11',
      heading: '11. Covenants Not to Compete',
      body: 'a. You acknowledge that we have engaged you in your role as Contractor in consideration of and reliance upon your agreement to deal exclusively with us. The term "Competitive Business" means any business, other than business originating from this Agreement, offering income tax preparation, income tax filing, and refund fulfillment services.\n\nb. You therefore agree that, during this Agreement\'s term and for a period of two (2) years after the termination or expiration of this Agreement, you will not: (i) perform services for a Competitive Business within the United States wherever located or operating; (ii) own, maintain, operate, engage in, franchise or license, or have any direct or indirect interest in a Competitive Business within the United States; or (iii) divert or attempt to divert any business, business opportunity or customer to a Competitive Business.\n\nc. These restrictions also apply after transfers and assignments, as provided in Section 11. Enforcing the covenants made in this Section 11 will not deprive you of your personal goodwill or ability to earn a living.',
    },
    {
      id: 's12',
      heading: '12. Successors and Assigns-',
      body: 'The rights, benefits, duties, and obligations under this Agreement shall inure to and be binding upon us, our successors and assigns and upon you and your legal representatives and heirs. This Agreement constitutes a personal service contract which may not be transferred or assigned by you. We may assign any of our rights and obligations hereunder to any subsidiary or affiliate of the Company or to a successor or surviving company resulting from a merger, consolidation, sale of assets or stock, or other corporate reorganization, on condition that the assignee shall assume all of our obligations hereunder.',
    },
    {
      id: 's13',
      heading: '13. Termination-',
      body: 'Either party may terminate this Agreement with or without cause upon seven (7) days written notice to the other party.',
    },
    {
      id: 's14',
      heading: '14. Obligations Upon Termination or Expiration-',
      body: 'Upon the termination or expiration of this Agreement for any reason, all of your rights under this Agreement will terminate and you will: (a) continue to comply with the non-competition and confidentiality provisions of Sections 10 and 11 and all other provisions that by their nature survive the term; (b) cease to hold yourself out in any way as a Contractor for the Company. You will complete all these modifications within seven (7) days after the termination or expiration of this Agreement.',
    },
    {
      id: 's15',
      heading: '15. Notices-',
      body: 'All notices or other communications required or permitted to be given hereunder shall be in writing and shall be deemed to have been duly given if delivered by hand delivery, overnight delivery service, charges prepaid, or by certified mail, return receipt requested (mailed notices shall be deemed to have been given one (1) day after the date sent) as follows:\n\nTo the Company:\n{{entity_name}}\n{{business_address}}\n{{city_state_zip}}\n{{notice_contact}}\n\nTo the Contractor:\n{{preparer_name}}\n{{preparer_address}}\n{{preparer_city}}\n{{preparer_name}}',
    },
    {
      id: 's16',
      heading: '16. Governing Law-',
      body: 'Except to the extent governed by the United States Trademark Act of 1946 (Lanham Act, 15 U.S.C. Sections 1051 et seq.), or other Federal Law, this Agreement and all claims arising from the relationship between us and you will be governed by the laws of the state of {{governing_state}} without regard to its conflict of laws rules.',
    },
    {
      id: 's17',
      heading: '17. Consent to Jurisdiction; Venue-',
      body: 'You agree that all actions arising under this Agreement or otherwise as a result of the relationship between you and us must be commenced in a state or Federal court of competent jurisdiction within such state or judicial district in which we have our principal place of business at the time the action is commenced, and you (and each owner) irrevocably submit to the jurisdiction of those courts.',
    },
    {
      id: 's18',
      heading: '18. Entire Agreement-',
      body: 'This constitutes our and your entire agreement, and there are no other oral or written understandings or agreements reached, or any representations made before this Agreement.',
    },
    {
      id: 's19',
      heading: '19. Waiver and Amendment-',
      body: 'This Agreement may not be modified or amended, and no provision of this Agreement may be waived, except in writing executed by each of the Parties.',
    },
    {
      id: 's20',
      heading: '20. Authority-',
      body: 'Each individual executing this Agreement in a representative capacity represents and warrants that he or she has the authority to execute this Agreement in the capacity indicated.',
    },
    {
      id: 'execution',
      heading: 'INTENDING TO BE LEGALLY BOUND,',
      body: 'the parties have executed this Agreement as of the date first written above.',
    },
  ],
}
