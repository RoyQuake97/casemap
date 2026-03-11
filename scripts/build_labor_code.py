#!/usr/bin/env python3
"""Build expanded Labor Code JSON from gathered web sources."""
import json

law = {
    "id": "LB-LAB-001-EXPANDED",
    "title_en": "Code of Labour (1946) - Expanded",
    "title_ar": "قانون العمل",
    "category": "labor",
    "subcategory": "employment",
    "date_enacted": "1946-09-23",
    "source": "Legislative Decree of 23 September 1946 (as amended)",
    "historical_context": "The Lebanese Code of Labour was enacted on 23 September 1946, shortly after Lebanon's independence. It remains the primary legislation governing employment relationships in Lebanon, covering individual and collective labor relations, working conditions, wages, termination, and labor disputes. Major amendments have been introduced over the decades, but the core framework remains in force.",
    "key_articles": []
}

articles = [
    # Preliminary Provisions
    {"number": "1", "title": "Scope of Application", "content": "The present Code shall apply to all employers and employees in Lebanon, subject to the exceptions provided herein. It governs the relations between employers and employees and defines their respective rights and obligations arising from employment contracts."},
    {"number": "2", "title": "Definition of Employer", "content": "An employer is any person, natural or juridical, who in an industrial, trading, or agricultural enterprise employs a worker in some capacity under a contract of employment, whether written or verbal."},
    {"number": "3", "title": "Definition of Employee", "content": "An employee is any person who undertakes, in return for remuneration, to work under the direction and supervision of another person, whether the contract is for a fixed or indefinite period."},
    {"number": "4", "title": "Exclusions from Application", "content": "The following are excluded from the scope of this Code: domestic servants and persons employed in family enterprises where only members of the family are employed. Agricultural workers are governed by special provisions."},
    {"number": "5", "title": "Written and Oral Contracts", "content": "The contract of labor can be either oral or written; if written, it must be in Arabic. It may however be translated into a foreign language if one of the parties does not understand Arabic."},
    {"number": "6", "title": "Types of Employment Contracts", "content": "Employment contracts may be for a determined or undetermined duration. A contract for a determined duration must specify the period or the completion of a specific task. If the parties continue to perform after the expiry of a fixed-term contract, it shall be deemed renewed for an indefinite period."},
    {"number": "7", "title": "Trial Period", "content": "The employment contract may provide for a trial period not exceeding three months. During this period, either party may terminate the contract without notice or indemnity. If the employee is retained beyond the trial period, the duration of the trial shall be counted as part of the service period."},
    {"number": "8", "title": "Establishments Subject to the Code", "content": "This Code applies to industrial, commercial, and agricultural establishments, as well as to enterprises providing services, public utility companies, liberal professions, associations, and other entities employing workers under conditions of subordination."},
    
    # Working Conditions
    {"number": "31", "title": "Maximum Working Hours", "content": "The maximum working hours shall be 48 hours per week. The employer shall organize working hours within this limit. Working hours may be distributed over six days or reduced to five days with corresponding longer daily hours, provided the daily maximum does not exceed the limits set by regulation."},
    {"number": "32", "title": "Overtime Compensation", "content": "Work performed beyond the normal working hours shall be compensated at a rate of at least 50% above the normal wage rate. Work performed on weekly rest days or public holidays shall be compensated at double the normal rate."},
    {"number": "33", "title": "Night Work Restrictions", "content": "Women and minors under eighteen years of age shall not be employed in industrial work between 7:00 PM and 7:00 AM, subject to exceptions provided by decree. Night work for adult male workers shall be compensated at a higher rate."},
    {"number": "34", "title": "Weekly Rest", "content": "Every employee is entitled to a weekly rest period of at least 36 consecutive hours, which shall normally include Sunday. The employer may fix the weekly rest day on a day other than Sunday for certain categories of work, provided the minimum rest period is observed."},
    {"number": "35", "title": "Public Holidays", "content": "Employees are entitled to paid leave on official public holidays as determined by the government. Work performed on public holidays shall be compensated at double the normal rate."},
    
    # Wages
    {"number": "44", "title": "Minimum Wage", "content": "The minimum wage shall be fixed by decree of the Council of Ministers, taking into account the cost of living, the economic situation, and the needs of the worker and his family. The salary should not be less than the average of the official minimum salary. The minimum wage as fixed by the Government is 675,000 LBP (subject to periodic revision)."},
    {"number": "45", "title": "Payment of Wages", "content": "Wages shall be paid at regular intervals not exceeding one month for monthly employees and one week for daily or piece-rate workers. Payment shall be made in the national currency at the workplace or through a bank transfer. Wages must be paid before any housing allowance that forms part of the remuneration."},
    {"number": "46", "title": "Wage Deductions", "content": "No deductions shall be made from an employee's wages except those provided by law, such as social security contributions, income tax, and amounts ordered by a court. Fines imposed by the employer shall not exceed five days' wages per month."},
    {"number": "47", "title": "Equal Pay", "content": "Women shall receive equal pay with men for equal work of the same nature and quality performed under the same conditions."},
    
    # Leaves
    {"number": "38", "title": "Annual Leave", "content": "Every employee has the right, every year, to take fifteen days of paid annual leave if one year has passed from the date of the conclusion of the employment contract. Employers may choose the date for such leaves according to work circumstances. The employer cannot dismiss the employee or send him a warning or a notice during his annual leave."},
    {"number": "39", "title": "Sick Leave", "content": "An employee who is unable to work due to illness or injury not related to employment shall be entitled to sick leave based on a medical report. The employer cannot dismiss or warn the employee during sick leave. The duration and compensation for sick leave is: half a month with full salary and half a month with half salary for employees with 3 months to 2 years of service; one month with full salary and one month with half salary for 2 to 4 years of service; one month and a half with full salary and one month and a half with half salary for 4 to 6 years of service; two months with full salary and two months with half salary for 6 to 10 years of service."},
    {"number": "40", "title": "Maternity Leave", "content": "A female employee is entitled to seven weeks of maternity leave with full pay, which may be taken before or after delivery. The employer shall not dismiss a female employee during her maternity leave or because of pregnancy. A nursing mother is entitled to one hour per day for nursing during the first year after birth."},
    {"number": "41", "title": "Bereavement Leave", "content": "An employee is entitled to two days of paid leave in case of the death of a family member (father, mother, children, or grandparents)."},
    {"number": "42", "title": "Leave During Notice Period", "content": "The employee has the right to leave work for one hour per day to search for another job during the notice period if any resignation or termination occurs."},
    
    # Employer Obligations
    {"number": "48", "title": "Employer's Obligation to Pay Salary", "content": "The employer must pay salary weekly or monthly. Payment may be in cash or in kind. The employer must pay the employee their basic wage before any housing allowance that forms part of their remuneration."},
    {"number": "49", "title": "Healthy and Safe Workplace", "content": "The employer must provide a healthy workplace with no hazardous environment and safe equipment. The employer shall take all necessary precautions to protect the lives and health of employees."},
    {"number": "50", "title": "Dignity and Respect", "content": "The employer must treat the employee with dignity. No insult or harassment shall be directed at employees. The employer shall respect the personal dignity and freedom of the employee."},
    {"number": "51", "title": "Provision of Work and Tools", "content": "The employer must allow the employee to do their job by providing access to the premises and supplying the pertinent tools needed to fulfill their tasks."},
    {"number": "52", "title": "Internal Work Policy", "content": "An employer who has fifteen employees or more must establish an internal work policy (règlement intérieur) setting out the rules of discipline, working hours, leaves, and other working conditions. This policy must be approved by the Ministry of Labour."},
    
    # Employee Obligations
    {"number": "53", "title": "Performance of Work", "content": "The employee must perform the work as agreed in the employment contract and act as a prudent administrator in carrying out assigned duties."},
    {"number": "54", "title": "Following Instructions", "content": "The employee must follow the orders and instructions of the employer and work under the employer's supervision and direction."},
    {"number": "55", "title": "Non-Competition", "content": "The employee must refrain from competition with the employer during and after employment, subject to limitations of time and distance as may be agreed in the contract or required by law."},
    
    # Termination
    {"number": "50-A", "title": "Termination by Mutual Consent", "content": "The employment contract may be terminated by the mutual consent of both parties. In this case, both parties decide to put an end to the employment contract by agreement."},
    {"number": "50-B", "title": "Termination by Force Majeure", "content": "Any strong event (force majeure) which might happen to the employer, to the employee, or to the establishment, such as the reduction in the size of the establishment, substituting a line of production with another, or the permanent cessation of work, could lead to the termination of the employment contract."},
    {"number": "50-C", "title": "Termination by Employer Without Indemnity", "content": "The employer may terminate the employment contract without indemnity in the following cases: (a) If the employee has assumed a nationality that is not his own; (b) If the period of work was set as a trial and the employer refused the employee within the three-month time limit; (c) If the employee commits or causes any damage to the employer, provided the employer documents this in writing and submits it to the Labour Ministry within three days; (d) If the employee has been absent, with no legal excuse, for more than fifteen days in one year, or for seven consecutive days; (e) If the employee was imprisoned for one year or more for a felony or misdemeanor at or through work; (f) If the employee attacked the employer or the manager at work."},
    {"number": "50-D", "title": "Termination by Employee", "content": "The employee has the right to leave work before the end of the employment contract in the following cases: (a) If the employer or his representative misleads the employee about the conditions of work, within thirty days of starting work; (b) If the employer fails to execute his obligations; (c) If the employer commits an unethical act against the employee or a member of his family; (d) If the employer or his representative commits a violent act against the employee."},
    {"number": "50-E", "title": "Abusive Dismissal", "content": "A dismissal is considered abusive (without just reason) when it is: (a) Not related to the quality of work; (b) Due to union membership; (c) Due to running for or being elected to union office; (d) Due to submitting a complaint to the Labour Ministry regarding implementation of labor law or filing a complaint against the employer; (e) Due to the employee exercising personal freedoms within the law. The damaged party may claim before the Labor Council within one month from knowledge of the dismissal and may use all kinds of proof. The Labor Council must take its decision within three months."},
    {"number": "50-F", "title": "End-of-Service Indemnity", "content": "The employer must pay the dismissed employee a remuneration equivalent to the salary of one month for every year worked, and the salary of half a month if the period of work was less than one year. An employee who has reached the age of 60 or who has completed 25 years of service at the same job may request dismissal and benefit from the leave indemnity."},
    {"number": "50-G", "title": "Warning and Infringement Procedure", "content": "If the employee, despite a warning, has committed three infringements against the internal regulations within one year, the employer may terminate the contract without indemnity. The employer must document each infringement in writing and submit it to the Labour Ministry within three days from the date of becoming aware of the infringement."},
    
    # Labor Disputes
    {"number": "77", "title": "Labor Councils (Judicial Competency)", "content": "In each district (Mouhafaza), there is one or more Labor Council which treats disputes arising between employers and employees. The Labor Council is composed of: (1) A judge from the 11th degree and above as president; (2) Two members: one employee representative and one employer representative (with two alternates for absences); (3) A Government Commissioner of the 3rd degree."},
    {"number": "78", "title": "Labor Council Procedures", "content": "The Labor Council shall attempt to reconcile the parties before proceeding to adjudicate the dispute. If reconciliation fails, the Council shall render a decision. For abusive dismissal claims, the Council must take its decision within three months."},
    
    # Child and Women Labour
    {"number": "22", "title": "Prohibition of Child Labour", "content": "Children under the age of 14 years shall not be employed in any work. Children between 14 and 18 years may be employed only in light work that is not harmful to their health, growth, or education, and only with the authorization of the Ministry of Labour."},
    {"number": "23", "title": "Restrictions on Women's Employment", "content": "Women shall not be employed in work that is dangerous, unhealthy, or morally harmful as defined by decree. Pregnant women shall not be required to perform work that may endanger their health or that of the child."},
    {"number": "24", "title": "Equal Treatment", "content": "Employers shall ensure equal treatment of employees regardless of sex, origin, or belief in matters of hiring, working conditions, promotion, wages, and termination."},
    
    # Collective Relations
    {"number": "83", "title": "Trade Unions", "content": "Workers and employers have the right to form and join trade unions for the defense of their professional interests. Trade unions must be registered with the Ministry of Labour and must have at least 15 members."},
    {"number": "84", "title": "Collective Bargaining", "content": "Employers and trade unions may negotiate collective labor agreements establishing conditions of employment that are more favorable than those provided by law. Collective agreements must be in writing and registered with the Ministry of Labour."},
    {"number": "85", "title": "Right to Strike", "content": "Workers have the right to strike as a means of defending their professional interests, provided that conciliation and mediation procedures have been exhausted. Strikes must be peaceful and must not involve violence or occupation of premises."},
    {"number": "86", "title": "Lock-out", "content": "Employers may resort to lock-out only after conciliation and mediation procedures have been exhausted. Lock-out must comply with the provisions of the Code of Collective Labor Agreements."},
    
    # Social Security Related
    {"number": "87", "title": "Work-Related Injuries", "content": "Employers are liable for injuries and occupational diseases suffered by employees in the course of or because of their work. Compensation for work-related injuries is governed by the Code of Occupational Injuries of 1983."},
    {"number": "88", "title": "Social Security Contributions", "content": "Employers and employees are required to contribute to the National Social Security Fund (NSSF) as provided by the Code of Social Security of 1963. The NSSF provides benefits for sickness, maternity, family allowances, and end-of-service indemnity."},
    
    # Foreign Workers
    {"number": "9", "title": "Employment of Foreigners", "content": "Foreign nationals may be employed in Lebanon only after obtaining a work permit from the Ministry of Labour. The work permit is granted based on the principle of priority for Lebanese workers and is subject to annual renewal."},
    {"number": "10", "title": "Reciprocity Principle", "content": "The employment of foreign workers is subject to reciprocity with the worker's country of origin. The Ministry of Labour may impose conditions on the employment of foreigners to protect the national labor market."},
    
    # Inspection and Penalties
    {"number": "89", "title": "Labour Inspection", "content": "The Ministry of Labour shall appoint labour inspectors to supervise the implementation of this Code. Labour inspectors have the right to enter any establishment at any time to verify compliance with labor laws and regulations."},
    {"number": "90", "title": "Penalties", "content": "Any employer who violates the provisions of this Code shall be liable to fines as determined by law. Repeated violations may result in closure of the establishment by order of the Ministry of Labour."},
    
    # Additional important provisions
    {"number": "56", "title": "Transfer of Enterprise", "content": "In the event of transfer of an enterprise by sale, merger, or succession, all employment contracts in force at the time of transfer shall remain binding on the new employer. Employees shall retain their rights and seniority."},
    {"number": "57", "title": "Employer's Certificate", "content": "Upon termination of employment, the employer must provide the employee with a certificate of employment indicating the dates of commencement and termination, the nature of the work performed, and the last salary received. The employer may not include any unfavorable remarks in the certificate."},
    {"number": "58", "title": "Workplace Register", "content": "Every employer must maintain a register of employees indicating their names, nationalities, dates of engagement, wages, and other particulars as required by regulation."},
    {"number": "59", "title": "Apprenticeship", "content": "An apprenticeship contract is a contract whereby an employer undertakes to provide vocational training to an apprentice who, in return, undertakes to work for the employer during the training period. The contract must be in writing and registered with the Ministry of Labour."},
    {"number": "60", "title": "Non-Discrimination", "content": "No employer may discriminate between employees on the basis of sex, origin, religion, or belief in any aspect of employment, including recruitment, wages, working conditions, promotion, and termination."},
]

law["key_articles"] = [
    {
        "article_number": a["number"],
        "title": a["title"],
        "content": a["content"],
        "penalties": "",
        "related_articles": []
    }
    for a in articles
]

data = {"laws": [law]}
with open("/home/user/workspace/casemap/data/labor_code_expanded.json", "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Created labor_code_expanded.json with {len(articles)} articles")
