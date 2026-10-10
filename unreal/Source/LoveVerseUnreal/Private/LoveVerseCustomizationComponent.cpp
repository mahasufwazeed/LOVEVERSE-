#include "LoveVerseCustomizationComponent.h"

#include "Net/UnrealNetwork.h"

ULoveVerseCustomizationComponent::ULoveVerseCustomizationComponent()
{
    SetIsReplicatedByDefault(true);
}

void ULoveVerseCustomizationComponent::SetAppearance(const FLVAvatarAppearance& NewAppearance)
{
    if (GetOwner() && GetOwner()->HasAuthority())
    {
        ApplyAppearance(NewAppearance);
        return;
    }
    ServerSetAppearance(NewAppearance);
}

void ULoveVerseCustomizationComponent::ServerSetAppearance_Implementation(const FLVAvatarAppearance& NewAppearance)
{
    ApplyAppearance(NewAppearance);
}

void ULoveVerseCustomizationComponent::ApplyAppearance(const FLVAvatarAppearance& NewAppearance)
{
    Appearance = NewAppearance;
    OnRep_Appearance();
}

void ULoveVerseCustomizationComponent::OnRep_Appearance()
{
    OnAppearanceChanged.Broadcast(Appearance);
}

void ULoveVerseCustomizationComponent::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(ULoveVerseCustomizationComponent, Appearance);
}
